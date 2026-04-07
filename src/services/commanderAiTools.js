/**
 * OpenAI function-calling tools for the Commander AI assistant.
 * Each tool maps 1-to-1 to a real Supabase service action.
 * Write operations go through RPC functions (same pattern as shibutsService).
 */
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// ─── Tool Schemas ──────────────────────────────────────────────────────────────

export const COMMANDER_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_guards",
      description:
        "קבל רשימת כל השומרים בבסיס עם האילוצים שלהם (ימים חסומים, שעות, עמדות, עמיתים נדחים).",
      parameters: {
        type: "object",
        properties: {
          camp_id: { type: "number", description: "מזהה הבסיס" },
        },
        required: ["camp_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_assignments",
      description:
        "קבל את לוח השמירות הקיים לבסיס (שיבוצי שמירה). ניתן לסנן לפי תאריך (epoch ms) או שומר.",
      parameters: {
        type: "object",
        properties: {
          camp_id: { type: "number", description: "מזהה הבסיס" },
          guard_id: { type: "number", description: "סנן לפי חייל ספציפי (אופציונלי)" },
          date_from: { type: "number", description: "epoch ms – תחילת טווח תאריכים (אופציונלי)" },
          date_to: { type: "number", description: "epoch ms – סוף טווח תאריכים (אופציונלי)" },
        },
        required: ["camp_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_shifts",
      description: "קבל את כל סלוטי השמירה המוגדרים בבסיס (עמדת שמירה, יום, שעות).",
      parameters: {
        type: "object",
        properties: {
          camp_id: { type: "number", description: "מזהה הבסיס" },
          outpost_id: { type: "number", description: "סנן לפי עמדה ספציפית (אופציונלי)" },
        },
        required: ["camp_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_guard",
      description:
        "שבץ שומר לשמירה ספציפית בתאריך מסוים. לפני שיבוץ – בדוק שאין אילוצים.",
      parameters: {
        type: "object",
        properties: {
          guard_id: { type: "number", description: "מזהה החייל" },
          shift_id: { type: "number", description: "מזהה המשמרת" },
          outpost_id: { type: "number", description: "מזהה העמדה" },
          camp_id: { type: "number", description: "מזהה הבסיס" },
          date_epoch_ms: {
            type: "number",
            description: "epoch ms – תאריך השמירה (חצות UTC)",
          },
        },
        required: ["guard_id", "shift_id", "outpost_id", "camp_id", "date_epoch_ms"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unassign_guard",
      description: "הסר שומר משמירה (מחק שיבוץ שמירה לפי מזהה שיבוץ).",
      parameters: {
        type: "object",
        properties: {
          shibut_id: { type: "number", description: "מזהה השיבוץ להסרה" },
        },
        required: ["shibut_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_assignment",
      description: "הזז שמירה קיימת לתאריך אחר (שנה את תאריך השמירה).",
      parameters: {
        type: "object",
        properties: {
          shibut_id: { type: "number", description: "מזהה השיבוץ" },
          new_date_epoch_ms: {
            type: "number",
            description: "epoch ms – התאריך החדש (חצות UTC)",
          },
        },
        required: ["shibut_id", "new_date_epoch_ms"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_guard_availability",
      description:
        "בדוק האם שומר זמין לשמירה מסוימת (בהתאם לאילוצי שעות, ימים, עמדות ועמיתים).",
      parameters: {
        type: "object",
        properties: {
          guard_id: { type: "number", description: "מזהה החייל" },
          shift_id: { type: "number", description: "מזהה המשמרת" },
          camp_id: { type: "number", description: "מזהה הבסיס" },
          date_epoch_ms: { type: "number", description: "epoch ms של התאריך" },
        },
        required: ["guard_id", "shift_id", "camp_id", "date_epoch_ms"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool Executor ─────────────────────────────────────────────────────────────

export async function executeCommanderTool(toolName, args) {
  switch (toolName) {
    case "list_guards":
      return listGuards(args);
    case "list_assignments":
      return listAssignments(args);
    case "list_shifts":
      return listShifts(args);
    case "assign_guard":
      return assignGuard(args);
    case "unassign_guard":
      return unassignGuard(args);
    case "move_assignment":
      return moveAssignment(args);
    case "check_guard_availability":
      return checkGuardAvailability(args);
    default:
      return { error: `כלי לא מוכר: ${toolName}` };
  }
}

// ─── Individual tool implementations ──────────────────────────────────────────

async function listGuards({ camp_id }) {
  const [guardsRes, timeLimitsRes, dayLimitsRes, outpostLimitsRes, peersRes] =
    await Promise.all([
      supabase.from("guards").select("*").eq("campId", camp_id),
      supabase.from("guard_time_limits").select("*"),
      supabase.from("guard_day_limits").select("*"),
      supabase.from("guard_outpost_limits").select("*"),
      supabase.from("guard_peer_exclusions").select("*").eq("campId", camp_id),
    ]);

  const guards = guardsRes.data ?? [];
  const timeLimits = timeLimitsRes.data ?? [];
  const dayLimits = dayLimitsRes.data ?? [];
  const outpostLimits = outpostLimitsRes.data ?? [];
  const peerExclusions = peersRes.data ?? [];

  return guards.map((g) => ({
    id: g.id,
    name: g.name,
    shouldBeAllocated: g.shouldBeAllocated,
    timeLimits: timeLimits
      .filter((l) => l.guardId === g.id)
      .map((l) => ({
        day: DAY_NAMES[(l.dayId ?? 1) - 1],
        dayId: l.dayId,
        from: `${l.fromHour}:00`,
        to: `${l.toHour}:00`,
      })),
    dayLimits: dayLimits
      .filter((l) => l.guardId === g.id)
      .map((l) => ({ day: DAY_NAMES[l.dayId ?? 0], dayId: l.dayId })),
    outpostLimits: outpostLimits
      .filter((l) => l.guardId === g.id)
      .map((l) => ({ outpostId: l.outpostId })),
    peerExclusions: peerExclusions
      .filter((e) => e.guardId === g.id)
      .map((e) => ({
        excludedGuardId: e.excludedGuardId,
        excludedName: guards.find((gg) => gg.id === e.excludedGuardId)?.name ?? `#${e.excludedGuardId}`,
      })),
  }));
}

async function listAssignments({ camp_id, guard_id, date_from, date_to }) {
  let q = supabase
    .from("shibuts")
    .select(`
      id, guardId, shiftId, outpostId, campId, theDate,
      guards(name),
      outposts(name),
      shifts(dayId, fromHour, toHour)
    `)
    .eq("campId", camp_id)
    .order("theDate");

  if (guard_id) q = q.eq("guardId", guard_id);
  if (date_from) q = q.gte("theDate", date_from);
  if (date_to) q = q.lte("theDate", date_to);

  const { data, error } = await q;
  if (error) return { error: error.message };

  return (data ?? []).map((s) => ({
    shibutId: s.id,
    guardName: s.guards?.name,
    guardId: s.guardId,
    outpost: s.outposts?.name,
    outpostId: s.outpostId,
    shiftId: s.shiftId,
    day: DAY_NAMES[(s.shifts?.dayId ?? 1) - 1],
    hours: s.shifts ? `${s.shifts.fromHour}:00-${s.shifts.toHour}:00` : "?",
    date: new Date(Number(s.theDate)).toLocaleDateString("he-IL"),
    dateEpoch: s.theDate,
  }));
}

async function listShifts({ camp_id, outpost_id }) {
  let q = supabase
    .from("shifts")
    .select("*, outposts(name, campId)")
    .order("outpostId")
    .order("dayId")
    .order("fromHour");

  if (outpost_id) {
    q = q.eq("outpostId", outpost_id);
  }

  const { data, error } = await q;
  if (error) return { error: error.message };

  const filtered = (data ?? []).filter(
    (s) => s.outposts?.campId === camp_id,
  );

  return filtered.map((s) => ({
    shiftId: s.id,
    outpost: s.outposts?.name,
    outpostId: s.outpostId,
    day: DAY_NAMES[(s.dayId ?? 1) - 1],
    dayId: s.dayId,
    from: `${s.fromHour}:00`,
    to: `${s.toHour}:00`,
  }));
}

async function assignGuard({ guard_id, shift_id, outpost_id, camp_id, date_epoch_ms }) {
  try {
    const creds = getCredentials();
    const { error } = await supabase.rpc("rpc_create_shibuts", {
      ...creds,
      p_guard_id: guard_id,
      p_shift_id: shift_id,
      p_outpost_id: outpost_id,
      p_camp_id: camp_id,
      p_the_date: date_epoch_ms,
    });
    if (error) return { error: error.message };
    return { success: true, message: "השיבוץ בוצע בהצלחה" };
  } catch (e) {
    return { error: e.message };
  }
}

async function unassignGuard({ shibut_id }) {
  try {
    const creds = getCredentials();
    const { error } = await supabase.rpc("rpc_delete_shibuts", {
      ...creds,
      p_shibuts_id: shibut_id,
    });
    if (error) return { error: error.message };
    return { success: true, message: `שיבוץ ${shibut_id} הוסר בהצלחה` };
  } catch (e) {
    return { error: e.message };
  }
}

async function moveAssignment({ shibut_id, new_date_epoch_ms }) {
  try {
    const creds = getCredentials();
    const { error } = await supabase.rpc("rpc_move_shibuts_date", {
      ...creds,
      p_shibuts_id: shibut_id,
      p_new_date: new_date_epoch_ms,
    });
    if (error) return { error: error.message };
    const newDate = new Date(Number(new_date_epoch_ms)).toLocaleDateString("he-IL");
    return { success: true, message: `השמירה הוזזה ל-${newDate} בהצלחה` };
  } catch (e) {
    return { error: e.message };
  }
}

async function checkGuardAvailability({ guard_id, shift_id, camp_id, date_epoch_ms }) {
  const [shiftRes, guardRes, timeLimitsRes, dayLimitsRes, outpostLimitsRes, peersRes, shibutsRes] =
    await Promise.all([
      supabase.from("shifts").select("*").eq("id", shift_id).single(),
      supabase.from("guards").select("*").eq("id", guard_id).single(),
      supabase.from("guard_time_limits").select("*").eq("guardId", guard_id),
      supabase.from("guard_day_limits").select("*").eq("guardId", guard_id),
      supabase.from("guard_outpost_limits").select("*").eq("guardId", guard_id),
      supabase.from("guard_peer_exclusions").select("*").eq("guardId", guard_id).eq("campId", camp_id),
      supabase.from("shibuts").select("guardId, shiftId").eq("shiftId", shift_id).eq("theDate", date_epoch_ms),
    ]);

  const shift = shiftRes.data;
  const guard = guardRes.data;
  const conflicts = [];

  if (!shift) return { available: false, reason: "שמירה לא נמצאה" };
  if (!guard?.shouldBeAllocated) conflicts.push("השומר מסומן כלא לשיבוץ");

  // Check day limit
  const dayLimits = dayLimitsRes.data ?? [];
  if (dayLimits.some((l) => l.dayId === shift.dayId)) {
    conflicts.push(`אילוץ יום: השומר חסום ביום ${DAY_NAMES[(shift.dayId ?? 1) - 1]}`);
  }

  // Check time limit
  const timeLimits = timeLimitsRes.data ?? [];
  timeLimits
    .filter((l) => l.dayId === shift.dayId)
    .forEach((l) => {
      if (shift.fromHour >= l.fromHour && shift.toHour <= l.toHour) {
        conflicts.push(
          `אילוץ שעות: ${DAY_NAMES[(l.dayId ?? 1) - 1]} ${l.fromHour}:00-${l.toHour}:00`,
        );
      }
    });

  // Check outpost limit
  const outpostLimits = outpostLimitsRes.data ?? [];
  if (outpostLimits.some((l) => l.outpostId === shift.outpostId)) {
    conflicts.push("אילוץ עמדה – השומר חסום בעמדת שמירה זו");
  }

  // Check peer exclusions
  const peers = peersRes.data ?? [];
  const existingGuards = (shibutsRes.data ?? []).map((s) => s.guardId);
  peers.forEach((e) => {
    if (existingGuards.includes(e.excludedGuardId)) {
      conflicts.push(`אילוץ עמית – שומר #${e.excludedGuardId} כבר שובץ לשמירה זו`);
    }
  });

  return {
    available: conflicts.length === 0,
    conflicts,
    message: conflicts.length === 0 ? "השומר זמין לשמירה" : conflicts.join("; "),
  };
}
