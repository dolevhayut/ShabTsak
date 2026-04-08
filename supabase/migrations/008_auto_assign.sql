-- ============================================================
-- Auto-assign guards to shifts for a date range
-- ============================================================
-- Convention notes:
--   shifts.dayId        : 1=Sunday .. 7=Saturday
--   guard_day_limits.dayId  : 0=Sunday .. 6=Saturday (JS getDay)
--   guard_time_limits.dayId : 0=Sunday .. 6=Saturday (JS getDay)
--   PostgreSQL EXTRACT(DOW) : 0=Sunday .. 6=Saturday  ← matches guard limits
--
-- Algorithm per day:
--   1. Resolve the shift-day-id = EXTRACT(DOW) + 1
--   2. For every shift whose dayId matches, iterate eligible guards
--      sorted by fewest existing assignments in the requested range
--      (fair distribution).
--   3. Pick up to outpost.minGuards guards, skipping peer-excluded pairs.
--   4. Skip slots that already have enough guards (idempotent).
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_auto_assign(
  p_user_id  TEXT,
  p_phone    TEXT,
  p_camp_id  INT,
  p_start_ts BIGINT,
  p_end_ts   BIGINT
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day          DATE;
  v_end_day      DATE;
  v_day_ts       BIGINT;   -- midnight-UTC epoch-ms for current day
  v_dow          INT;       -- 0=Sun .. 6=Sat  (PostgreSQL DOW, matches guard limits)
  v_shift_day_id INT;       -- 1=Sun .. 7=Sat  (shifts table convention)

  v_shift        RECORD;
  v_min_guards   INT;
  v_already      INT;       -- guards already assigned to this slot
  v_guard        RECORD;
  v_assigned     INT[];     -- guard IDs picked for this slot so far
  v_new_row      public.shibuts;
BEGIN
  -- ── Auth ────────────────────────────────────────────────────────────────────
  PERFORM public.assert_commander(p_user_id, p_phone);

  -- ── Date loop ───────────────────────────────────────────────────────────────
  v_day     := DATE(timezone('UTC', to_timestamp(p_start_ts / 1000.0)));
  v_end_day := DATE(timezone('UTC', to_timestamp(p_end_ts   / 1000.0)));

  WHILE v_day <= v_end_day LOOP
    -- Midnight-UTC timestamp in milliseconds for this day
    v_day_ts       := EXTRACT(EPOCH FROM v_day AT TIME ZONE 'UTC')::BIGINT * 1000;
    v_dow          := EXTRACT(DOW FROM v_day)::INT;   -- 0=Sun
    v_shift_day_id := v_dow + 1;                      -- 1=Sun for shifts table

    -- ── Shift loop ────────────────────────────────────────────────────────────
    FOR v_shift IN
      SELECT
        s.id          AS shift_id,
        s."outpostId" AS outpost_id,
        s."fromHour"  AS from_hour,
        s."toHour"    AS to_hour,
        COALESCE(o."minGuards", 1) AS min_guards
      FROM   public.shifts   s
      JOIN   public.outposts o ON o.id = s."outpostId"
      WHERE  s."dayId"   = v_shift_day_id
        AND  o."campId"  = p_camp_id
      ORDER BY s."outpostId", s."fromHour"
    LOOP
      v_min_guards := v_shift.min_guards;

      -- How many guards are already assigned to this exact slot?
      SELECT COUNT(*) INTO v_already
      FROM   public.shibuts
      WHERE  "shiftId"  = v_shift.shift_id
        AND  "campId"   = p_camp_id
        AND  "theDate"  = v_day_ts;

      -- Skip if slot is already fully covered
      CONTINUE WHEN v_already >= v_min_guards;

      v_assigned := ARRAY[]::INT[];

      -- ── Guard selection ────────────────────────────────────────────────────
      FOR v_guard IN
        SELECT g.id
        FROM   public.guards g
        WHERE  g."campId"            = p_camp_id
          AND  g."shouldBeAllocated" = true

          -- Not blocked for this entire day
          AND  g.id NOT IN (
            SELECT "guardId"
            FROM   public.guard_day_limits
            WHERE  "dayId" = v_dow
          )

          -- Not blocked by a time-window limit on this day
          -- (limit overlaps the shift when NOT entirely before or after it)
          AND  g.id NOT IN (
            SELECT "guardId"
            FROM   public.guard_time_limits
            WHERE  "dayId" = v_dow
              AND  NOT (
                "toHour"   <= v_shift.from_hour    -- limit ends before shift starts
                OR "fromHour" >= v_shift.to_hour   -- limit starts after shift ends
              )
          )

          -- Not restricted from this outpost
          AND  g.id NOT IN (
            SELECT "guardId"
            FROM   public.guard_outpost_limits
            WHERE  "outpostId" = v_shift.outpost_id
          )

          -- Not already assigned to this exact slot
          AND  g.id NOT IN (
            SELECT "guardId"
            FROM   public.shibuts
            WHERE  "shiftId" = v_shift.shift_id
              AND  "campId"  = p_camp_id
              AND  "theDate" = v_day_ts
          )

        -- Fair distribution: fewest assignments in the requested range first
        ORDER BY (
          SELECT COUNT(*)
          FROM   public.shibuts s2
          WHERE  s2."guardId" = g.id
            AND  s2."campId"  = p_camp_id
            AND  s2."theDate" >= p_start_ts
            AND  s2."theDate" <= p_end_ts
        ) ASC, g.id ASC
      LOOP
        -- Stop as soon as we've filled the remaining slots
        EXIT WHEN (v_already + array_length(v_assigned, 1)) >= v_min_guards
               OR array_length(v_assigned, 1) IS NOT DISTINCT FROM NULL AND v_already >= v_min_guards;

        -- Respect peer exclusions (both directions)
        IF array_length(v_assigned, 1) > 0 AND EXISTS (
          SELECT 1
          FROM   public.guard_peer_exclusions
          WHERE  (    "guardId" = v_guard.id   AND "excludedGuardId" = ANY(v_assigned) )
             OR  (    "guardId" = ANY(v_assigned) AND "excludedGuardId" = v_guard.id   )
        ) THEN
          CONTINUE;
        END IF;

        -- Assign this guard
        INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
        VALUES (v_guard.id, v_shift.shift_id, v_shift.outpost_id, p_camp_id, v_day_ts)
        RETURNING * INTO v_new_row;

        v_assigned := v_assigned || v_guard.id;

        RETURN NEXT v_new_row;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END;
$$;

-- Grant execute to anon role (identity is checked inside via assert_commander)
REVOKE ALL   ON FUNCTION public.rpc_auto_assign(TEXT, TEXT, INT, BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_auto_assign(TEXT, TEXT, INT, BIGINT, BIGINT) TO anon;
