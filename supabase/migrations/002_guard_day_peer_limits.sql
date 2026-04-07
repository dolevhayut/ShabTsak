-- ============================================
-- Whole-day limits (per JS getDay(): 0=Sun .. 6=Sat)
-- ============================================
CREATE TABLE IF NOT EXISTS public.guard_day_limits (
  id SERIAL PRIMARY KEY,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "dayId" INT NOT NULL CHECK ("dayId" BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("guardId", "dayId")
);

ALTER TABLE public.guard_day_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guard_day_limits_anon_read" ON public.guard_day_limits FOR SELECT TO anon USING (true);

-- ============================================
-- Peer exclusions: guard A cannot be assigned with guard B (same slot)
-- ============================================
CREATE TABLE IF NOT EXISTS public.guard_peer_exclusions (
  id SERIAL PRIMARY KEY,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "excludedGuardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("guardId", "excludedGuardId"),
  CHECK ("guardId" <> "excludedGuardId")
);

ALTER TABLE public.guard_peer_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guard_peer_exclusions_anon_read" ON public.guard_peer_exclusions FOR SELECT TO anon USING (true);

-- ============================================
-- RPCs (commander only)
-- ============================================
CREATE OR REPLACE FUNCTION public.rpc_create_day_limit(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_day_id INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.guard_day_limits ("guardId", "dayId")
  VALUES (p_guard_id, p_day_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_day_limit(
  p_user_id TEXT, p_phone TEXT,
  p_limit_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.guard_day_limits WHERE id = p_limit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_create_peer_exclusion(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_excluded_guard_id INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
  v_camp1 INT;
  v_camp2 INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  IF p_guard_id = p_excluded_guard_id THEN
    RAISE EXCEPTION 'INVALID: guard cannot exclude self';
  END IF;
  SELECT "campId" INTO v_camp1 FROM public.guards WHERE id = p_guard_id;
  SELECT "campId" INTO v_camp2 FROM public.guards WHERE id = p_excluded_guard_id;
  IF v_camp1 IS NULL OR v_camp2 IS NULL OR v_camp1 <> v_camp2 THEN
    RAISE EXCEPTION 'INVALID: guards must belong to the same camp';
  END IF;
  INSERT INTO public.guard_peer_exclusions ("guardId", "excludedGuardId", "campId")
  VALUES (p_guard_id, p_excluded_guard_id, v_camp1)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_delete_peer_exclusion(
  p_user_id TEXT, p_phone TEXT,
  p_limit_id INT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  DELETE FROM public.guard_peer_exclusions WHERE id = p_limit_id;
END;
$$;
