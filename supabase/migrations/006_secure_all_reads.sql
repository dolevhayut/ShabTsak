-- ============================================================
-- Security: remove all open anon-read policies and replace
-- every direct table SELECT with identity-verified RPCs.
-- system_messages direct writes also replaced with RPCs.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HELPER: assert caller belongs to a specific camp
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_camp_member(
  p_user_id TEXT,
  p_phone   TEXT,
  p_camp_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  IF NOT EXISTS (
    SELECT 1 FROM public.user_guard_links
    WHERE "userId" = p_user_id AND "campId" = p_camp_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: not a member of camp %', p_camp_id;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- GUARDS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_guards_by_camp(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT
) RETURNS SETOF public.guards
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY SELECT * FROM public.guards WHERE "campId" = p_camp_id ORDER BY id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_guard_by_id(
  p_user_id TEXT, p_phone TEXT, p_guard_id INT
) RETURNS SETOF public.guards
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.guards WHERE id = p_guard_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY SELECT * FROM public.guards WHERE id = p_guard_id;
END;
$$;

-- Guards + all limits in one call (replaces getGuardsAndLimitsForCampId)
CREATE OR REPLACE FUNCTION public.rpc_get_guards_with_limits(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT
) RETURNS TABLE (
  guard         JSONB,
  time_limits   JSONB,
  outpost_limits JSONB,
  day_limits    JSONB,
  peer_exclusions JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT
      to_jsonb(g)                                                                                     AS guard,
      COALESCE((SELECT jsonb_agg(tl) FROM public.guard_time_limits tl   WHERE tl."guardId" = g.id), '[]'::jsonb) AS time_limits,
      COALESCE((SELECT jsonb_agg(ol) FROM public.guard_outpost_limits ol WHERE ol."guardId" = g.id), '[]'::jsonb) AS outpost_limits,
      COALESCE((SELECT jsonb_agg(dl) FROM public.guard_day_limits dl     WHERE dl."guardId" = g.id), '[]'::jsonb) AS day_limits,
      COALESCE((SELECT jsonb_agg(pe) FROM public.guard_peer_exclusions pe WHERE pe."campId" = g."campId"), '[]'::jsonb) AS peer_exclusions
    FROM public.guards g
    WHERE g."campId" = p_camp_id
    ORDER BY g.id;
END;
$$;

-- Individual guard limits (used in dialogs)
CREATE OR REPLACE FUNCTION public.rpc_get_guard_limits(
  p_user_id TEXT, p_phone TEXT, p_guard_id INT
) RETURNS TABLE (
  time_limits    JSONB,
  outpost_limits JSONB,
  day_limits     JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.guards WHERE id = p_guard_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY SELECT
    COALESCE((SELECT jsonb_agg(tl) FROM public.guard_time_limits   tl WHERE tl."guardId" = p_guard_id), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(ol) FROM public.guard_outpost_limits ol WHERE ol."guardId" = p_guard_id), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(dl) FROM public.guard_day_limits     dl WHERE dl."guardId" = p_guard_id), '[]'::jsonb);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- OUTPOSTS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_outposts_by_camp(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT
) RETURNS SETOF public.outposts
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY SELECT * FROM public.outposts WHERE "campId" = p_camp_id ORDER BY id;
END;
$$;

-- Outposts with nested shifts (replaces .select("*, shifts(*)"))
CREATE OR REPLACE FUNCTION public.rpc_get_outposts_with_shifts(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT
) RETURNS TABLE (
  id INT, name TEXT, "campId" INT, "minGuards" INT, created_at TIMESTAMPTZ,
  shifts JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT
      o.id, o.name, o."campId", o."minGuards", o.created_at,
      COALESCE(
        jsonb_agg(to_jsonb(s) ORDER BY s."dayId", s."fromHour")
        FILTER (WHERE s.id IS NOT NULL),
        '[]'::jsonb
      ) AS shifts
    FROM public.outposts o
    LEFT JOIN public.shifts s ON s."outpostId" = o.id
    WHERE o."campId" = p_camp_id
    GROUP BY o.id, o.name, o."campId", o."minGuards", o.created_at
    ORDER BY o.id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SHIFTS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_shifts_by_outpost(
  p_user_id TEXT, p_phone TEXT, p_outpost_id INT
) RETURNS SETOF public.shifts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.outposts WHERE id = p_outpost_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY
    SELECT * FROM public.shifts WHERE "outpostId" = p_outpost_id ORDER BY "dayId", "fromHour";
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SHIBUTS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_shibuts_by_camp(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT,
  p_start_ts BIGINT, p_end_ts BIGINT
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT * FROM public.shibuts
    WHERE "campId" = p_camp_id AND "theDate" >= p_start_ts AND "theDate" <= p_end_ts;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_shibuts_by_guard(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_camp_id INT,
  p_start_ts BIGINT DEFAULT NULL, p_end_ts BIGINT DEFAULT NULL
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT * FROM public.shibuts
    WHERE "guardId" = p_guard_id AND "campId" = p_camp_id
      AND (p_start_ts IS NULL OR "theDate" >= p_start_ts)
      AND (p_end_ts   IS NULL OR "theDate" <= p_end_ts)
    ORDER BY "theDate" ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_shibuts_by_id(
  p_user_id TEXT, p_phone TEXT, p_shibuts_id INT
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.shibuts WHERE id = p_shibuts_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY SELECT * FROM public.shibuts WHERE id = p_shibuts_id;
END;
$$;

-- Next upcoming shibuts for a guard (with shift + outpost info)
CREATE OR REPLACE FUNCTION public.rpc_get_next_shibuts_for_guard(
  p_user_id TEXT, p_phone TEXT, p_guard_id INT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_camp_id INT;
  v_now_ts  BIGINT;
  v_row     public.shibuts;
  v_shift   JSONB;
  v_outpost JSONB;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.guards WHERE id = p_guard_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);

  v_now_ts := (EXTRACT(EPOCH FROM date_trunc('day', now())) * 1000)::BIGINT;

  SELECT * INTO v_row
  FROM public.shibuts
  WHERE "guardId" = p_guard_id AND "theDate" >= v_now_ts
  ORDER BY "theDate" ASC
  LIMIT 1;

  IF v_row IS NULL THEN RETURN NULL; END IF;

  SELECT to_jsonb(s) INTO v_shift  FROM public.shifts  s WHERE s.id = v_row."shiftId";
  SELECT to_jsonb(o) INTO v_outpost FROM public.outposts o WHERE o.id = v_row."outpostId";

  RETURN to_jsonb(v_row) || jsonb_build_object('shifts', v_shift, 'outposts', v_outpost);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SHIFT REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_shift_requests_by_camp(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT, p_status TEXT DEFAULT NULL
) RETURNS SETOF public.shift_requests
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT * FROM public.shift_requests
    WHERE "campId" = p_camp_id AND (p_status IS NULL OR status = p_status)
    ORDER BY "createdAt" DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_my_shift_requests(
  p_user_id TEXT, p_phone TEXT
) RETURNS SETOF public.shift_requests
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  RETURN QUERY
    SELECT * FROM public.shift_requests
    WHERE "requesterUserId" = p_user_id
    ORDER BY "createdAt" DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_shift_requests_by_guard(
  p_user_id TEXT, p_phone TEXT, p_guard_id INT
) RETURNS SETOF public.shift_requests
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.verify_user(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.guards WHERE id = p_guard_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY
    SELECT * FROM public.shift_requests
    WHERE "requesterGuardId" = p_guard_id
    ORDER BY "createdAt" DESC;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SYSTEM MESSAGES (read + write – all commander-gated)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_get_system_messages(
  p_user_id TEXT, p_phone TEXT, p_camp_id INT,
  p_include_inactive BOOLEAN DEFAULT FALSE
) RETURNS SETOF public.system_messages
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_camp_member(p_user_id, p_phone, p_camp_id);
  RETURN QUERY
    SELECT * FROM public.system_messages
    WHERE "campId" = p_camp_id AND (p_include_inactive OR "isActive" = TRUE)
    ORDER BY "createdAt" DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_system_message(
  p_user_id   TEXT, p_phone TEXT,
  p_camp_id   INT,  p_outpost_id INT,
  p_title     TEXT, p_content TEXT,
  p_priority  TEXT, p_expires_at BIGINT
) RETURNS SETOF public.system_messages
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  RETURN QUERY
    INSERT INTO public.system_messages
      ("campId","outpostId","authorUserId",title,content,priority,"expiresAt","isActive")
    VALUES
      (p_camp_id, p_outpost_id, p_user_id, p_title, p_content,
       COALESCE(p_priority,'info'), p_expires_at, TRUE)
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_system_message(
  p_user_id    TEXT, p_phone TEXT, p_id INT,
  p_title      TEXT DEFAULT NULL, p_content TEXT DEFAULT NULL,
  p_priority   TEXT DEFAULT NULL, p_expires_at BIGINT DEFAULT NULL,
  p_is_active  BOOLEAN DEFAULT NULL
) RETURNS SETOF public.system_messages
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.system_messages WHERE id = p_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  RETURN QUERY
    UPDATE public.system_messages SET
      title      = COALESCE(p_title,      title),
      content    = COALESCE(p_content,    content),
      priority   = COALESCE(p_priority,   priority),
      "expiresAt"= COALESCE(p_expires_at, "expiresAt"),
      "isActive" = COALESCE(p_is_active,  "isActive")
    WHERE id = p_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_system_message(
  p_user_id TEXT, p_phone TEXT, p_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_camp_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  SELECT "campId" INTO v_camp_id FROM public.system_messages WHERE id = p_id;
  PERFORM public.assert_camp_member(p_user_id, p_phone, v_camp_id);
  DELETE FROM public.system_messages WHERE id = p_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- GRANT all new RPCs to anon (identity verified inside)
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.assert_camp_member(TEXT, TEXT, INT)                                      TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_guards_by_camp(TEXT, TEXT, INT)                                  TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_guard_by_id(TEXT, TEXT, INT)                                     TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_guards_with_limits(TEXT, TEXT, INT)                              TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_guard_limits(TEXT, TEXT, INT)                                    TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_outposts_by_camp(TEXT, TEXT, INT)                                TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_outposts_with_shifts(TEXT, TEXT, INT)                            TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shifts_by_outpost(TEXT, TEXT, INT)                               TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shibuts_by_camp(TEXT, TEXT, INT, BIGINT, BIGINT)                 TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shibuts_by_guard(TEXT, TEXT, INT, INT, BIGINT, BIGINT)           TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shibuts_by_id(TEXT, TEXT, INT)                                   TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_next_shibuts_for_guard(TEXT, TEXT, INT)                          TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shift_requests_by_camp(TEXT, TEXT, INT, TEXT)                    TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_shift_requests(TEXT, TEXT)                                    TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_shift_requests_by_guard(TEXT, TEXT, INT)                         TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_system_messages(TEXT, TEXT, INT, BOOLEAN)                        TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_system_message(TEXT, TEXT, INT, INT, TEXT, TEXT, TEXT, BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_system_message(TEXT, TEXT, INT, TEXT, TEXT, TEXT, BIGINT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_delete_system_message(TEXT, TEXT, INT)                               TO anon;

-- ────────────────────────────────────────────────────────────
-- REMOVE all open anon-read / anon-write policies
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "guards_anon_read"              ON public.guards;
DROP POLICY IF EXISTS "outposts_anon_read"            ON public.outposts;
DROP POLICY IF EXISTS "shifts_anon_read"              ON public.shifts;
DROP POLICY IF EXISTS "shibuts_anon_read"             ON public.shibuts;
DROP POLICY IF EXISTS "guard_time_limits_anon_read"   ON public.guard_time_limits;
DROP POLICY IF EXISTS "guard_day_limits_anon_read"    ON public.guard_day_limits;
DROP POLICY IF EXISTS "guard_outpost_limits_anon_read" ON public.guard_outpost_limits;
DROP POLICY IF EXISTS "guard_peer_exclusions_anon_read" ON public.guard_peer_exclusions;
DROP POLICY IF EXISTS "shift_requests_anon_read"      ON public.shift_requests;
DROP POLICY IF EXISTS "system_messages_anon_read"     ON public.system_messages;
DROP POLICY IF EXISTS "system_messages_anon_insert"   ON public.system_messages;
DROP POLICY IF EXISTS "system_messages_anon_update"   ON public.system_messages;
DROP POLICY IF EXISTS "system_messages_anon_delete"   ON public.system_messages;
DROP POLICY IF EXISTS "ai_commander_intents_anon_read" ON public.ai_commander_intents;
DROP POLICY IF EXISTS "commander_actions_log_anon_read" ON public.commander_actions_log;
DROP POLICY IF EXISTS "shibuts_events_anon_read"      ON public.shibuts_events;
DROP POLICY IF EXISTS "shibuts_events_anon_insert"    ON public.shibuts_events;
DROP POLICY IF EXISTS "shibuts_events_anon_delete"    ON public.shibuts_events;
