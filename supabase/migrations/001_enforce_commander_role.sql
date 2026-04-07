-- ============================================
-- Helper: verify user identity and return role
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_user(p_user_id TEXT, p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE id = p_user_id AND phone = p_phone;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'AUTH_FAILED: invalid credentials';
  END IF;

  RETURN v_role;
END;
$$;

-- ============================================
-- Helper: assert commander role
-- ============================================
CREATE OR REPLACE FUNCTION public.assert_commander(p_user_id TEXT, p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := public.verify_user(p_user_id, p_phone);
  IF v_role <> 'commander' THEN
    RAISE EXCEPTION 'FORBIDDEN: commander role required';
  END IF;
END;
$$;

-- ============================================
-- Camps: insert / update / delete
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_camp(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.camps (name) VALUES (p_name) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_camp(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT, p_name TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.camps SET name = p_name WHERE id = p_camp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_camp(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.camps WHERE id = p_camp_id;
END;
$$;

-- ============================================
-- Guards: insert / update / delete
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_guard(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_camp_id INT, p_color TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId", color)
  VALUES (p_name, p_mail, p_guard_phone, p_should_be_allocated, p_camp_id, COALESCE(p_color, '#2563EB'))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_guard(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_name TEXT, p_mail TEXT, p_guard_phone TEXT,
  p_should_be_allocated BOOLEAN, p_color TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.guards
  SET name = p_name, mail = p_mail, phone = p_guard_phone,
      "shouldBeAllocated" = p_should_be_allocated, color = COALESCE(p_color, color)
  WHERE id = p_guard_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_guard(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.guards WHERE id = p_guard_id;
END;
$$;

-- ============================================
-- Outposts: insert / update / delete
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_outpost(
  p_user_id TEXT, p_phone TEXT,
  p_name TEXT, p_camp_id INT, p_min_guards INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.outposts (name, "campId", "minGuards")
  VALUES (p_name, p_camp_id, COALESCE(p_min_guards, 1))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_outpost(
  p_user_id TEXT, p_phone TEXT,
  p_outpost_id INT, p_name TEXT, p_min_guards INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.outposts SET name = p_name, "minGuards" = COALESCE(p_min_guards, "minGuards")
  WHERE id = p_outpost_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_outpost(
  p_user_id TEXT, p_phone TEXT,
  p_outpost_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.outposts WHERE id = p_outpost_id;
END;
$$;

-- ============================================
-- Shifts: insert / update / delete
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_shift(
  p_user_id TEXT, p_phone TEXT,
  p_outpost_id INT, p_day_id INT, p_from_hour INT, p_to_hour INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.shifts ("outpostId", "dayId", "fromHour", "toHour")
  VALUES (p_outpost_id, p_day_id, p_from_hour, p_to_hour)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_shift(
  p_user_id TEXT, p_phone TEXT,
  p_shift_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.shifts WHERE id = p_shift_id;
END;
$$;

-- ============================================
-- Shibuts: insert / update / delete
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_shibuts(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_shift_id INT, p_outpost_id INT, p_camp_id INT, p_the_date BIGINT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
  VALUES (p_guard_id, p_shift_id, p_outpost_id, p_camp_id, p_the_date)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_shibuts(
  p_user_id TEXT, p_phone TEXT,
  p_shibuts_id INT, p_guard_id INT, p_shift_id INT, p_outpost_id INT, p_camp_id INT, p_the_date BIGINT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.shibuts
  SET "guardId" = p_guard_id, "shiftId" = p_shift_id,
      "outpostId" = p_outpost_id, "campId" = p_camp_id, "theDate" = p_the_date
  WHERE id = p_shibuts_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_shibuts(
  p_user_id TEXT, p_phone TEXT,
  p_shibuts_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.shibuts WHERE id = p_shibuts_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_shibuts_range(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT, p_start_ts BIGINT, p_end_ts BIGINT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.shibuts
  WHERE "campId" = p_camp_id AND "theDate" >= p_start_ts AND "theDate" <= p_end_ts;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_move_shibuts_date(
  p_user_id TEXT, p_phone TEXT,
  p_shibuts_id INT, p_new_date BIGINT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.shibuts SET "theDate" = p_new_date WHERE id = p_shibuts_id;
END;
$$;

-- ============================================
-- Guard limits: insert / delete (commander only)
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_time_limit(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_day_id INT, p_from_hour INT, p_to_hour INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guard_time_limits ("guardId", "dayId", "fromHour", "toHour")
  VALUES (p_guard_id, p_day_id, p_from_hour, p_to_hour)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_time_limit(
  p_user_id TEXT, p_phone TEXT,
  p_limit_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.guard_time_limits WHERE id = p_limit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_outpost_limit(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_outpost_id INT, p_camp_id INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guard_outpost_limits ("guardId", "outpostId", "campId")
  VALUES (p_guard_id, p_outpost_id, p_camp_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_outpost_limit(
  p_user_id TEXT, p_phone TEXT,
  p_limit_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.guard_outpost_limits WHERE id = p_limit_id;
END;
$$;

-- ============================================
-- Shift requests: create (any user), review (commander)
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_shift_request(
  p_user_id TEXT, p_phone TEXT,
  p_camp_id INT, p_requester_guard_id INT, p_target_shibuts_id INT,
  p_request_type TEXT, p_reason TEXT, p_requested_payload JSONB
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  INSERT INTO public.shift_requests (
    "campId", "requesterUserId", "requesterGuardId", "targetShibutsId",
    "requestType", reason, "requestedPayload"
  ) VALUES (
    p_camp_id, p_user_id, p_requester_guard_id, p_target_shibuts_id,
    p_request_type, p_reason, COALESCE(p_requested_payload, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_review_shift_request(
  p_user_id TEXT, p_phone TEXT,
  p_request_id INT, p_status TEXT, p_review_note TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.shift_requests
  SET status = p_status,
      "reviewedBy" = p_user_id,
      "reviewedAt" = now(),
      "reviewNote" = p_review_note
  WHERE id = p_request_id;
END;
$$;

-- ============================================
-- Restrict RLS: read-only for anon on write tables
-- ============================================

-- Camps: drop permissive "all" policy, allow only SELECT
DROP POLICY IF EXISTS "camps_anon_all" ON public.camps;
CREATE POLICY "camps_anon_read" ON public.camps FOR SELECT TO anon USING (true);

-- Outposts
DROP POLICY IF EXISTS "outposts_anon_all" ON public.outposts;
CREATE POLICY "outposts_anon_read" ON public.outposts FOR SELECT TO anon USING (true);

-- Guards
DROP POLICY IF EXISTS "guards_anon_all" ON public.guards;
CREATE POLICY "guards_anon_read" ON public.guards FOR SELECT TO anon USING (true);

-- Shifts
DROP POLICY IF EXISTS "shifts_anon_all" ON public.shifts;
CREATE POLICY "shifts_anon_read" ON public.shifts FOR SELECT TO anon USING (true);

-- Shibuts
DROP POLICY IF EXISTS "shibuts_anon_all" ON public.shibuts;
CREATE POLICY "shibuts_anon_read" ON public.shibuts FOR SELECT TO anon USING (true);

-- Guard time limits
DROP POLICY IF EXISTS "guard_time_limits_anon_all" ON public.guard_time_limits;
CREATE POLICY "guard_time_limits_anon_read" ON public.guard_time_limits FOR SELECT TO anon USING (true);

-- Guard outpost limits
DROP POLICY IF EXISTS "guard_outpost_limits_anon_all" ON public.guard_outpost_limits;
CREATE POLICY "guard_outpost_limits_anon_read" ON public.guard_outpost_limits FOR SELECT TO anon USING (true);

-- Shift requests: read + insert (via RPC only for insert but keep anon read for listing)
DROP POLICY IF EXISTS "shift_requests_anon_all" ON public.shift_requests;
CREATE POLICY "shift_requests_anon_read" ON public.shift_requests FOR SELECT TO anon USING (true);

-- Commander actions log: read-only
DROP POLICY IF EXISTS "commander_actions_log_anon_all" ON public.commander_actions_log;
CREATE POLICY "commander_actions_log_anon_read" ON public.commander_actions_log FOR SELECT TO anon USING (true);

-- AI commander intents: read-only
DROP POLICY IF EXISTS "ai_commander_intents_anon_all" ON public.ai_commander_intents;
CREATE POLICY "ai_commander_intents_anon_read" ON public.ai_commander_intents FOR SELECT TO anon USING (true);

-- Users: keep existing read + insert (for registration)
-- user_guard_links: keep read + insert
DROP POLICY IF EXISTS "user_guard_links_anon_all" ON public.user_guard_links;
CREATE POLICY "user_guard_links_anon_read" ON public.user_guard_links FOR SELECT TO anon USING (true);
CREATE POLICY "user_guard_links_anon_insert" ON public.user_guard_links FOR INSERT TO anon WITH CHECK (true);
