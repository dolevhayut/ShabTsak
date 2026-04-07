import OpenAI from "openai";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function getClient() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY לא מוגדר ב-.env");
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

function getModel() {
  return import.meta.env.VITE_OPENAI_MODEL ?? "gpt-5.4";
}

/**
 * GPT-5.x sampling rules (from OpenAI docs):
 * - With function tools → pass NO sampling params (API returns 400 otherwise)
 * - Without tools      → reasoning_effort:"none" + temperature is valid
 */
function samplingParams(model, { withTools = false } = {}) {
  const m = model.toLowerCase();
  if (m.startsWith("gpt-5")) {
    return withTools ? {} : { reasoning_effort: "none", temperature: 0.3 };
  }
  return { temperature: 0.3 };
}



function buildSystemPrompt(campContext = {}) {
  const { campName, guards = [], outposts = [] } = campContext;
  const guardList = guards
    .map((g) => `- ${g.name} (id:${g.id})`)
    .join("\n");
  const outpostList = outposts
    .map((o) => `- ${o.name} (id:${o.id})`)
    .join("\n");

  return [
    `אתה עוזר מפקד AI לניהול לוח שמירות בצבא.`,
    `המינוח הנכון: שמירה (לא "משמרת" בלבד), שמר (עבר), שומר (בוצע השמירה), לוח שמירות, שיבוץ לשמירה.`,
    campName ? `הבסיס: ${campName}` : "",
    outpostList ? `עמדות שמירה:\n${outpostList}` : "",
    guardList ? `שומרים:\n${guardList}` : "",
    ``,
    `אתה יכול לבצע פעולות אמיתיות על לוח השמירות:`,
    `- לשבץ שומר לשמירה`,
    `- להסיר שיבוץ שמירה`,
    `- להזיז שמירה לתאריך אחר`,
    `- לבדוק זמינות שומר (מגבלות שעות, ימים, עמדות, עמיתים)`,
    `- להציג את לוח השמירות הקיים`,
    ``,
    `כשמתבצעת פעולה – דווח בקצרה על מה בוצע.`,
    `כשיש בקשה לשיבוץ, בדוק תחילה אילוצים לפני ביצוע.`,
    `ענה תמיד בעברית צבאית תמציתית.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Agentic chat loop: runs until no more tool calls (max 6 rounds).
 * Returns array of assistant messages (text + tool results).
 */
export async function commanderChat({ messages, tools, campContext, onToolCall }) {
  const client = getClient();
  const model = getModel();
  const systemPrompt = buildSystemPrompt(campContext);

  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const assistantEvents = [];
  const MAX_ROUNDS = 6;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const hasTool = !!tools?.length;
    const completion = await client.chat.completions.create({
      model,
      messages: allMessages,
      tools: hasTool ? tools : undefined,
      tool_choice: hasTool ? "auto" : undefined,
      ...samplingParams(model, { withTools: hasTool }),
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    allMessages.push(msg);

    if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
      assistantEvents.push({ type: "text", content: msg.content ?? "" });
      break;
    }

    // Process each tool call
    const toolResults = [];
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments ?? "{}");
      let result;
      try {
        result = onToolCall ? await onToolCall(tc.function.name, args) : { error: "אין מטפל כלים" };
      } catch (e) {
        result = { error: String(e) };
      }
      toolResults.push({ id: tc.id, name: tc.function.name, args, result });
      allMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
    assistantEvents.push({ type: "tool_calls", calls: toolResults });
  }

  return assistantEvents;
}

/**
 * After each AI response – suggest 2-4 quick-reply chips the user can click.
 * Returns string[] (empty if nothing obvious to suggest).
 */
export async function getQuickReplies(lastAiText, campContext = {}) {
  try {
    const client = getClient();
    const model = getModel();
    const { guards = [], outposts = [] } = campContext;

    const context = [
      outposts.length ? `עמדות: ${outposts.map((o) => o.name).join(", ")}` : "",
      guards.length ? `שומרים (דוגמאות): ${guards.slice(0, 6).map((g) => g.name).join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: [
            `אתה עוזר שמציע 2-4 תשובות מהירות קצרות למפקד, בהתבסס על תשובת ה-AI האחרונה.`,
            `החזר JSON בלבד: {"replies": ["...", "..."]}`,
            `כל תשובה: עד 10 מילים. כתוב משפט מלא ומובן אם צריך (לא רק שם).`,
            `הצע רק אם יש משהו ברור לענות (שם עמדה, שם שומר, תאריך, "כן/לא", פקודה קצרה).`,
            `אם אין מה להציע – החזר {"replies": []}.`,
            context ? `קונטקסט:\n${context}` : "",
          ].filter(Boolean).join("\n"),
        },
        {
          role: "user",
          content: `תשובת ה-AI:\n"${lastAiText.slice(0, 500)}"`,
        },
      ],
      response_format: { type: "json_object" },
      ...samplingParams(model, { withTools: false }),
      max_completion_tokens: 200,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return Array.isArray(parsed.replies) ? parsed.replies.slice(0, 4) : [];
  } catch {
    return [];
  }
}

/**
 * One-shot recommendation for a shift request approval dialog.
 * Returns a short Hebrew text recommendation.
 */
/**
 * Rich AI recommendation for a shift-request approval dialog.
 *
 * @param {object} params
 * @param {object} params.request        - the shift request row
 * @param {object} params.guard          - requester guard object
 * @param {object} params.guardLimits    - { timeLimits, dayLimits, outpostLimits, peerExclusions }
 * @param {Array}  params.guards         - all guards in the camp
 * @param {object} [params.shiftInfo]    - { guardName, outpostName, hours, date } from targetShibuts
 * @param {Map}    [params.outpostMap]   - Map<outpostId, outpostName> for resolving limit IDs
 * @param {Array}  [params.guardsStats]  - [{ guard, totalShibuts }] for load comparison
 */
export async function getShiftRequestRecommendation({
  request,
  guard,
  guardLimits,
  guards,
  shiftInfo,
  outpostMap,
  guardsStats,
}) {
  const client = getClient();
  const model = getModel();

  const dayLabel = (dayId) => DAY_NAMES[(dayId ?? 1) - 1] ?? `יום ${dayId}`;
  const formatHour = (h) => String(h).padStart(2, "0") + ":00";
  const outpostName = (id) => outpostMap?.get(Number(id)) ?? `עמדה #${id}`;

  // ── Constraint summary ────────────────────────────────────────────────────
  const limitsLines = [];
  if (guardLimits?.timeLimits?.length) {
    guardLimits.timeLimits.forEach((l) =>
      limitsLines.push(`- אילוץ שעות: ${dayLabel(l.dayId)} ${formatHour(l.fromHour)}–${formatHour(l.toHour)}`),
    );
  }
  if (guardLimits?.dayLimits?.length) {
    guardLimits.dayLimits.forEach((l) =>
      limitsLines.push(`- יום חסום: ${dayLabel(l.dayId)}`),
    );
  }
  if (guardLimits?.outpostLimits?.length) {
    guardLimits.outpostLimits.forEach((l) =>
      limitsLines.push(`- עמדה חסומה: ${outpostName(l.outpostId)}`),
    );
  }
  if (guardLimits?.peerExclusions?.length) {
    guardLimits.peerExclusions.forEach((e) => {
      const peer = guards?.find((g) => g.id === e.excludedGuardId);
      limitsLines.push(`- אילוץ עמית: לא עם ${peer?.name ?? `שומר #${e.excludedGuardId}`}`);
    });
  }

  // ── Load comparison ───────────────────────────────────────────────────────
  const requesterStats = guardsStats?.find((s) => s.guard?.id === guard?.id);
  const requesterShifts = requesterStats?.totalShibuts ?? 0;
  const avgShifts = guardsStats?.length
    ? (guardsStats.reduce((sum, s) => sum + (s.totalShibuts ?? 0), 0) / guardsStats.length).toFixed(1)
    : "—";
  const maxShifts = guardsStats?.length
    ? Math.max(...guardsStats.map((s) => s.totalShibuts ?? 0))
    : "—";

  // ── Build prompt ──────────────────────────────────────────────────────────
  const lines = [
    `## בקשת ${request.requestType === "swap" ? "החלפת שמירה" : "פטור משמירה"}`,
    `**שומר מבקש:** ${guard?.name ?? "לא ידוע"}`,
    `**סיבת הבקשה:** "${request.reason}"`,
    ``,
  ];

  if (shiftInfo) {
    lines.push(
      `## פרטי השיבוץ המדובר`,
      `- **עמדה:** ${shiftInfo.outpostName}`,
      `- **שעות:** ${shiftInfo.hours}`,
      `- **תאריך:** ${shiftInfo.date}`,
      ``,
    );
  }

  lines.push(
    `## אילוצים רשומים`,
    limitsLines.length ? limitsLines.join("\n") : "אין אילוצים רשומים במערכת",
    ``,
    `## עומס שמירות (השוואה)`,
    `- ${guard?.name ?? "השומר"}: **${requesterShifts} שמירות**`,
    `- ממוצע בבסיס: ${avgShifts} | מקסימום: ${maxShifts}`,
    ``,
    `## בקשתך`,
    `תן למפקד המלצה מנומקת בפורמט markdown:`,
    `1. **המלצה** (אשר / דחה / פשרה) — בשורה הראשונה בולטת`,
    `2. **נימוקים** — 2-3 נקודות קצרות`,
    `3. **הצעה מעשית** — אם רלוונטי (מי יכול להחליף, איזה תאריך חלופי וכו׳)`,
  );

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "אתה יועץ מפקד לניהול לוח שמירות. " +
          "השתמש במינוח צבאי: שמירה, שומר, שיבוץ, אילוץ, לוח שמירות. " +
          "ענה בעברית, בפורמט markdown קצר ומעשי. אל תחזור על נתונים שכבר ניתנו.",
      },
      { role: "user", content: lines.join("\n") },
    ],
    ...samplingParams(model, { withTools: false }),
    max_completion_tokens: 400,
  });

  return completion.choices[0]?.message?.content ?? "לא הצלחתי לייצר המלצה.";
}
