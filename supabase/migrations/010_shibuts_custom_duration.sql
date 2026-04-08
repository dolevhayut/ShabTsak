-- Support custom shibuts duration (including half-hours)
-- Allows overriding shift template times per assignment.

ALTER TABLE public.shibuts
  ADD COLUMN IF NOT EXISTS "startMinute" INT,
  ADD COLUMN IF NOT EXISTS "endMinute" INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shibuts_start_minute_range_chk'
  ) THEN
    ALTER TABLE public.shibuts
      ADD CONSTRAINT shibuts_start_minute_range_chk
      CHECK (
        "startMinute" IS NULL
        OR ("startMinute" >= 0 AND "startMinute" <= 1439)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shibuts_end_minute_range_chk'
  ) THEN
    ALTER TABLE public.shibuts
      ADD CONSTRAINT shibuts_end_minute_range_chk
      CHECK (
        "endMinute" IS NULL
        OR ("endMinute" >= 1 AND "endMinute" <= 2880)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shibuts_custom_minutes_pair_chk'
  ) THEN
    ALTER TABLE public.shibuts
      ADD CONSTRAINT shibuts_custom_minutes_pair_chk
      CHECK (
        ("startMinute" IS NULL AND "endMinute" IS NULL)
        OR ("startMinute" IS NOT NULL AND "endMinute" IS NOT NULL AND "endMinute" > "startMinute")
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_create_shibuts(
  p_user_id TEXT, p_phone TEXT,
  p_guard_id INT, p_shift_id INT, p_outpost_id INT, p_camp_id INT, p_the_date BIGINT,
  p_start_minute INT DEFAULT NULL, p_end_minute INT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id INT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  INSERT INTO public.shibuts (
    "guardId", "shiftId", "outpostId", "campId", "theDate", "startMinute", "endMinute"
  )
  VALUES (
    p_guard_id, p_shift_id, p_outpost_id, p_camp_id, p_the_date, p_start_minute, p_end_minute
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_shibuts(
  p_user_id TEXT, p_phone TEXT,
  p_shibuts_id INT, p_guard_id INT, p_shift_id INT, p_outpost_id INT, p_camp_id INT, p_the_date BIGINT,
  p_start_minute INT DEFAULT NULL, p_end_minute INT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);
  UPDATE public.shibuts
  SET "guardId" = p_guard_id,
      "shiftId" = p_shift_id,
      "outpostId" = p_outpost_id,
      "campId" = p_camp_id,
      "theDate" = p_the_date,
      "startMinute" = p_start_minute,
      "endMinute" = p_end_minute
  WHERE id = p_shibuts_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_shibuts(TEXT, TEXT, INT, INT, INT, INT, BIGINT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_update_shibuts(TEXT, TEXT, INT, INT, INT, INT, INT, BIGINT, INT, INT) TO anon;
