-- ============================================
-- Camp registration code (per base) + secure self-registration
-- ============================================

ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS registration_code TEXT;

-- Backfill unique codes for existing rows
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  attempts INT;
BEGIN
  FOR r IN SELECT id FROM public.camps WHERE registration_code IS NULL OR btrim(registration_code) = '' LOOP
    attempts := 0;
    LOOP
      v_code := upper(substring(regexp_replace(gen_random_uuid()::text, '-', '', 'g') from 1 for 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.camps c WHERE c.registration_code = v_code);
      attempts := attempts + 1;
      IF attempts > 100 THEN
        RAISE EXCEPTION 'Could not generate registration_code for camp %', r.id;
      END IF;
    END LOOP;
    UPDATE public.camps SET registration_code = v_code WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.camps ALTER COLUMN registration_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS camps_registration_code_uidx ON public.camps (registration_code);

-- ============================================
-- Camps: create with auto-generated code
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
    v_code := upper(substring(regexp_replace(gen_random_uuid()::text, '-', '', 'g') from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.camps c WHERE c.registration_code = v_code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Failed to generate registration code';
    END IF;
  END LOOP;
  INSERT INTO public.camps (name, registration_code) VALUES (p_name, v_code) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- Camps: update name + optional registration code
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_update_camp(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT, p_name TEXT,
  p_registration_code TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.camps
  SET
    name = p_name,
    registration_code = COALESCE(
      NULLIF(upper(btrim(p_registration_code)), ''),
      registration_code
    )
  WHERE id = p_camp_id;
END;
$$;

-- ============================================
-- Self-registration: validate camp code, create user + guard + link
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
  v_code := upper(btrim(p_camp_code));

  IF v_nm = '' OR v_uid = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'REGISTER_MISSING_FIELDS';
  END IF;

  IF v_code = '' THEN
    RAISE EXCEPTION 'REGISTER_MISSING_CAMP_CODE';
  END IF;

  SELECT c.id INTO v_camp_id
  FROM public.camps c
  WHERE upper(btrim(c.registration_code)) = v_code
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

GRANT EXECUTE ON FUNCTION public.rpc_register_with_camp_code(TEXT, TEXT, TEXT, TEXT) TO anon;

-- Registration only through RPC (camp code required)
DROP POLICY IF EXISTS "Allow anon insert" ON public.users;
