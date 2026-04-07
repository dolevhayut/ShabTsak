import { supabase } from "@/services/supabaseClient";

type CommanderOnboardingPayload = {
  sourceRef: string;
  fullName: string;
  campName: string;
  commanderId: string;
  commanderPhone: string;
  onboardingPassword: string;
};

type CommanderOnboardingResult = {
  source_ref: string;
  user_id: string;
  camp_id: number;
  guard_id: number;
  registration_code: string;
};

export async function createCommanderOnboarding(
  payload: CommanderOnboardingPayload,
): Promise<CommanderOnboardingResult> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new Error("Missing Supabase config");
  }

  const res = await fetch(`${baseUrl}/functions/v1/create-commander-camp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "x-form-password": payload.onboardingPassword.trim(),
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "יצירת הרשמה פנימית נכשלה");
  }

  return data as CommanderOnboardingResult;
}
