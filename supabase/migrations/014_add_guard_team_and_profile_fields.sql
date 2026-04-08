-- ============================================================
-- Add team + profile fields to guards and update RPCs
-- ============================================================

ALTER TABLE public.guards
  ADD COLUMN IF NOT EXISTS "role" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "joinedAt" DATE,
  ADD COLUMN IF NOT EXISTS "team" TEXT;

-- ── rpc_create_guard ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_create_guard(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_camp_id INT,
  p_color TEXT, p_personal_id TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_joined_at DATE DEFAULT NULL, p_team TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guards (
    name, mail, phone, "shouldBeAllocated", "campId", color, "personalId",
    "role", "notes", "joinedAt", "team"
  )
  VALUES (
    p_name, p_mail, p_guard_phone, p_should_be_allocated, p_camp_id,
    COALESCE(p_color, '#2563EB'), p_personal_id,
    p_role, p_notes, p_joined_at, p_team
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── rpc_update_guard ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_update_guard(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_color TEXT,
  p_personal_id TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_joined_at DATE DEFAULT NULL, p_team TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.guards
  SET name                = p_name,
      mail                = p_mail,
      phone               = p_guard_phone,
      "shouldBeAllocated" = p_should_be_allocated,
      color               = COALESCE(p_color, color),
      "personalId"        = p_personal_id,
      "role"              = p_role,
      "notes"             = p_notes,
      "joinedAt"          = p_joined_at,
      "team"              = p_team
  WHERE id = p_guard_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_guard(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,INT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_guard(TEXT,TEXT,INT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT,TEXT,TEXT,DATE,TEXT)  TO anon;

