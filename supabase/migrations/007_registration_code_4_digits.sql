-- ============================================
-- Enforce 4-digit camp registration codes
-- ============================================

-- Backfill any non-4-digit code to a unique 4-digit numeric code.
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  attempts INT;
BEGIN
  FOR r IN
    SELECT id
    FROM public.camps
    WHERE registration_code IS NULL
       OR btrim(registration_code) !~ '^[0-9]{4}$'
  LOOP
    attempts := 0;
    LOOP
      v_code := lpad((floor(random() * 10000))::INT::TEXT, 4, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.camps c WHERE c.registration_code = v_code
      );
      attempts := attempts + 1;
      IF attempts > 20000 THEN
        RAISE EXCEPTION 'Could not generate 4-digit registration_code for camp %', r.id;
      END IF;
    END LOOP;

    UPDATE public.camps
    SET registration_code = v_code
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.camps
  ALTER COLUMN registration_code SET NOT NULL;

ALTER TABLE public.camps
  DROP CONSTRAINT IF EXISTS camps_registration_code_4_digits_chk;

ALTER TABLE public.camps
  ADD CONSTRAINT camps_registration_code_4_digits_chk
  CHECK (registration_code ~ '^[0-9]{4}$');

-- ============================================
-- Camps: create with auto-generated 4-digit code
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_camp(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_id INT;
  v_code TEXT;
  attempts INT := 0;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  LOOP
    v_code := lpad((floor(random() * 10000))::INT::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.camps c WHERE c.registration_code = v_code);
    attempts := attempts + 1;
    IF attempts > 20000 THEN
      RAISE EXCEPTION 'Failed to generate registration code';
    END IF;
  END LOOP;
  INSERT INTO public.camps (name, registration_code) VALUES (p_name, v_code) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- Camps: update with 4-digit validation
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_update_camp(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT, p_name TEXT,
  p_registration_code TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_code TEXT := NULLIF(btrim(p_registration_code), '');
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);

  IF v_code IS NOT NULL AND v_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_REGISTRATION_CODE_FORMAT';
  END IF;

  UPDATE public.camps
  SET
    name = p_name,
    registration_code = COALESCE(v_code, registration_code)
  WHERE id = p_camp_id;
END;
$$;

-- ============================================
-- Register with camp code: 4-digit normalization/validation
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_register_with_camp_code(
  p_name TEXT,
  p_id TEXT,
  p_phone TEXT,
  p_camp_code TEXT
) RETURNS TABLE (
  id TEXT,
  phone TEXT,
  name TEXT,
  email TEXT,
  picture TEXT,
  role TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_camp_id INT;
  v_guard_id INT;
  v_uid TEXT;
  v_phone TEXT;
  v_nm TEXT;
  v_code TEXT;
BEGIN
  v_uid := btrim(p_id);
  v_phone := btrim(p_phone);
  v_nm := btrim(p_name);
  v_code := btrim(p_camp_code);

  IF v_nm = '' OR v_uid = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'REGISTER_MISSING_FIELDS';
  END IF;

  IF v_code = '' THEN
    RAISE EXCEPTION 'REGISTER_MISSING_CAMP_CODE';
  END IF;

  IF v_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'REGISTER_INVALID_CAMP_CODE';
  END IF;

  SELECT c.id INTO v_camp_id
  FROM public.camps c
  WHERE btrim(c.registration_code) = v_code
  LIMIT 1;

  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'REGISTER_INVALID_CAMP_CODE';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_uid) THEN
    RAISE EXCEPTION 'REGISTER_USER_EXISTS';
  END IF;

  INSERT INTO public.users (id, phone, name, role)
  VALUES (v_uid, v_phone, v_nm, 'member');

  INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId")
  VALUES (v_nm, NULL, v_phone, true, v_camp_id)
  RETURNING guards.id INTO v_guard_id;

  INSERT INTO public.user_guard_links ("userId", "guardId", "campId")
  VALUES (v_uid, v_guard_id, v_camp_id);

  RETURN QUERY
  SELECT u.id, u.phone, u.name, u.email, u.picture, u.role
  FROM public.users u
  WHERE u.id = v_uid;
END;
$$;

-- ============================================
-- Commander onboarding: generate 4-digit camp code
-- ============================================
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
    v_code := lpad((floor(random() * 10000))::INT::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.camps c WHERE c.registration_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 20000 THEN
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
