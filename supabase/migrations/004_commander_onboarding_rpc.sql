CREATE TABLE IF NOT EXISTS public.commander_onboarding_requests (
  id SERIAL PRIMARY KEY,
  source_ref TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.commander_onboarding_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rpc_onboard_commander_with_camp(
  p_source_ref TEXT,
  p_user_id TEXT,
  p_phone TEXT,
  p_name TEXT,
  p_camp_name TEXT,
  p_email TEXT DEFAULT NULL
) RETURNS TABLE (
  camp_id INT,
  guard_id INT,
  registration_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_ref TEXT := btrim(p_source_ref);
  v_user_id TEXT := btrim(p_user_id);
  v_phone TEXT := btrim(p_phone);
  v_name TEXT := btrim(p_name);
  v_camp_name TEXT := btrim(p_camp_name);
  v_email TEXT := NULLIF(btrim(p_email), '');
  v_camp_id INT;
  v_guard_id INT;
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF v_source_ref = '' OR v_user_id = '' OR v_phone = '' OR v_name = '' OR v_camp_name = '' THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_FIELDS';
  END IF;

  -- Idempotency: return existing onboarding result for retries.
  RETURN QUERY
  SELECT cor."campId", cor."guardId", c.registration_code
  FROM public.commander_onboarding_requests cor
  JOIN public.camps c ON c.id = cor."campId"
  WHERE cor.source_ref = v_source_ref
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.users (id, phone, name, email, role)
  VALUES (v_user_id, v_phone, v_name, v_email, 'commander')
  ON CONFLICT (id) DO UPDATE
  SET
    phone = EXCLUDED.phone,
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, public.users.email),
    role = 'commander';

  LOOP
    v_code := upper(substring(regexp_replace(gen_random_uuid()::text, '-', '', 'g') from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.camps c WHERE c.registration_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'FAILED_TO_GENERATE_REGISTRATION_CODE';
    END IF;
  END LOOP;

  INSERT INTO public.camps (name, registration_code)
  VALUES (v_camp_name, v_code)
  RETURNING id INTO v_camp_id;

  INSERT INTO public.outposts (name, "campId", "minGuards")
  VALUES ('ש.ג ראשי', v_camp_id, 1);

  INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId", color)
  VALUES (v_name, v_email, v_phone, true, v_camp_id, '#2563EB')
  RETURNING id INTO v_guard_id;

  INSERT INTO public.user_guard_links ("userId", "guardId", "campId")
  VALUES (v_user_id, v_guard_id, v_camp_id)
  ON CONFLICT ("userId", "campId") DO UPDATE
  SET "guardId" = EXCLUDED."guardId";

  INSERT INTO public.commander_onboarding_requests (source_ref, "userId", "campId", "guardId")
  VALUES (v_source_ref, v_user_id, v_camp_id, v_guard_id)
  ON CONFLICT (source_ref) DO NOTHING;

  RETURN QUERY
  SELECT v_camp_id, v_guard_id, v_code;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY
    SELECT cor."campId", cor."guardId", c.registration_code
    FROM public.commander_onboarding_requests cor
    JOIN public.camps c ON c.id = cor."campId"
    WHERE cor.source_ref = v_source_ref
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_onboard_commander_with_camp(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_onboard_commander_with_camp(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
