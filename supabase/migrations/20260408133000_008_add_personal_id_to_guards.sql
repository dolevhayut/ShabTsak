-- ============================================================
-- Add personalId column to guards and update RPCs
-- ============================================================

ALTER TABLE public.guards
  ADD COLUMN IF NOT EXISTS "personalId" TEXT;

-- ── rpc_create_guard ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_create_guard(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_camp_id INT,
  p_color TEXT, p_personal_id TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId", color, "personalId")
  VALUES (p_name, p_mail, p_guard_phone, p_should_be_allocated, p_camp_id,
          COALESCE(p_color, '#2563EB'), p_personal_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── rpc_update_guard ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_update_guard(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_color TEXT,
  p_personal_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.guards
  SET name               = p_name,
      mail               = p_mail,
      phone              = p_guard_phone,
      "shouldBeAllocated"= p_should_be_allocated,
      color              = COALESCE(p_color, color),
      "personalId"       = p_personal_id
  WHERE id = p_guard_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_guard(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,INT,TEXT,TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_guard(TEXT,TEXT,INT,TEXT,TEXT,TEXT,BOOLEAN,TEXT,TEXT)  TO anon;
