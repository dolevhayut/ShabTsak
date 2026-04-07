type CommanderOnboardingPayload = {
  sourceRef: string;
  fullName: string;
  campName: string;
  commanderId: string;
  commanderPhone: string;
};

type CommanderOnboardingResult = {
  source_ref: string;
  user_id: string;
  camp_id: number;
  guard_id: number;
  registration_code: string;
};

function getFunctionUrl() {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("VITE_SUPABASE_URL לא מוגדר");
  }
  return `${baseUrl}/functions/v1/create-commander-camp`;
}

export async function createCommanderOnboarding(
  payload: CommanderOnboardingPayload,
): Promise<CommanderOnboardingResult> {
  const webhookSecret = import.meta.env.VITE_COMMANDER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("VITE_COMMANDER_WEBHOOK_SECRET לא מוגדר");
  }

  const res = await fetch(getFunctionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": webhookSecret,
    },
    body: JSON.stringify({
      source_ref: payload.sourceRef.trim(),
      user_id: payload.commanderId.trim(),
      phone: payload.commanderPhone.trim(),
      full_name: payload.fullName.trim(),
      camp_name: payload.campName.trim(),
      create_auth_user: false,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "יצירת הרשמה פנימית נכשלה");
  }

  return json as CommanderOnboardingResult;
}
