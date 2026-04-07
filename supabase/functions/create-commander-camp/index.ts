import { createClient } from "npm:@supabase/supabase-js@2";

type OnboardRequest = {
  source_ref: string;
  user_id: string;
  phone: string;
  full_name: string;
  camp_name: string;
  email?: string;
  password?: string;
  create_auth_user?: boolean;
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return response(405, { ok: false, error: "Method not allowed" });
  }

  const webhookSecret = Deno.env.get("COMMANDER_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return response(500, { ok: false, error: "Missing COMMANDER_WEBHOOK_SECRET" });
  }

  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (providedSecret !== webhookSecret) {
    return response(401, { ok: false, error: "Unauthorized" });
  }

  let payload: OnboardRequest;
  try {
    payload = await req.json();
  } catch {
    return response(400, { ok: false, error: "Invalid JSON body" });
  }

  if (
    !isNonEmptyString(payload?.source_ref) ||
    !isNonEmptyString(payload?.user_id) ||
    !isNonEmptyString(payload?.phone) ||
    !isNonEmptyString(payload?.full_name) ||
    !isNonEmptyString(payload?.camp_name)
  ) {
    return response(400, {
      ok: false,
      error: "Missing required fields: source_ref, user_id, phone, full_name, camp_name",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, { ok: false, error: "Missing Supabase runtime env vars" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const shouldCreateAuthUser = payload.create_auth_user ?? !!payload.email;
  let authUserCreated = false;
  let generatedPassword: string | null = null;

  if (shouldCreateAuthUser && isNonEmptyString(payload.email)) {
    generatedPassword = isNonEmptyString(payload.password)
      ? payload.password
      : crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const { error: authError } = await admin.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name.trim(),
        user_id: payload.user_id.trim(),
        source_ref: payload.source_ref.trim(),
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      const duplicate = msg.includes("already") || msg.includes("exists");
      if (!duplicate) {
        return response(500, { ok: false, error: `Auth user create failed: ${authError.message}` });
      }
      generatedPassword = null;
    } else {
      authUserCreated = true;
    }
  }

  const { data: onboardData, error: onboardError } = await admin.rpc(
    "rpc_onboard_commander_with_camp",
    {
      p_source_ref: payload.source_ref.trim(),
      p_user_id: payload.user_id.trim(),
      p_phone: payload.phone.trim(),
      p_name: payload.full_name.trim(),
      p_camp_name: payload.camp_name.trim(),
      p_email: payload.email?.trim() || null,
    },
  );

  if (onboardError) {
    return response(500, { ok: false, error: `Onboarding RPC failed: ${onboardError.message}` });
  }

  const row = Array.isArray(onboardData) ? onboardData[0] : onboardData;
  if (!row) {
    return response(500, { ok: false, error: "Onboarding RPC returned no data" });
  }

  return response(200, {
    ok: true,
    source_ref: payload.source_ref.trim(),
    user_id: payload.user_id.trim(),
    camp_id: row.camp_id,
    guard_id: row.guard_id,
    registration_code: row.registration_code,
    auth_user_created: authUserCreated,
    temporary_password: generatedPassword,
  });
});
