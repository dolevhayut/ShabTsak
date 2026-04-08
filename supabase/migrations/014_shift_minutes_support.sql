-- Support shift times with minutes (fractional hours)
-- Example: 05:45 is stored as 5.75

ALTER TABLE public.shifts
  ALTER COLUMN "fromHour" TYPE DOUBLE PRECISION USING "fromHour"::DOUBLE PRECISION,
  ALTER COLUMN "toHour" TYPE DOUBLE PRECISION USING "toHour"::DOUBLE PRECISION;

ALTER TABLE public.guard_time_limits
  ALTER COLUMN "fromHour" TYPE DOUBLE PRECISION USING "fromHour"::DOUBLE PRECISION,
  ALTER COLUMN "toHour" TYPE DOUBLE PRECISION USING "toHour"::DOUBLE PRECISION;

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_fromhour_check,
  DROP CONSTRAINT IF EXISTS shifts_tohour_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_fromhour_check CHECK ("fromHour" BETWEEN 0 AND 24),
  ADD CONSTRAINT shifts_tohour_check CHECK ("toHour" BETWEEN 0 AND 24);

ALTER TABLE public.guard_time_limits
  DROP CONSTRAINT IF EXISTS guard_time_limits_fromhour_check,
  DROP CONSTRAINT IF EXISTS guard_time_limits_tohour_check;

ALTER TABLE public.guard_time_limits
  ADD CONSTRAINT guard_time_limits_fromhour_check CHECK ("fromHour" BETWEEN 0 AND 24),
  ADD CONSTRAINT guard_time_limits_tohour_check CHECK ("toHour" BETWEEN 0 AND 24);

DROP FUNCTION IF EXISTS public.rpc_create_shift(TEXT, TEXT, INT, INT, INT, INT);
CREATE OR REPLACE FUNCTION public.rpc_create_shift(
  p_user_id TEXT,
  p_phone TEXT,
  p_outpost_id INT,
  p_day_id INT,
  p_from_hour DOUBLE PRECISION,
  p_to_hour DOUBLE PRECISION
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

DROP FUNCTION IF EXISTS public.rpc_create_time_limit(TEXT, TEXT, INT, INT, INT, INT);
CREATE OR REPLACE FUNCTION public.rpc_create_time_limit(
  p_user_id TEXT,
  p_phone TEXT,
  p_guard_id INT,
  p_day_id INT,
  p_from_hour DOUBLE PRECISION,
  p_to_hour DOUBLE PRECISION
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

GRANT EXECUTE ON FUNCTION public.rpc_create_shift(TEXT, TEXT, INT, INT, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_create_time_limit(TEXT, TEXT, INT, INT, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
