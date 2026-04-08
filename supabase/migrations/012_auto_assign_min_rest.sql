-- ============================================================
-- Auto-assign hard minimum rest gap (8 hours)
-- ============================================================
-- Why:
-- The previous algorithm could still assign the same guard with very short
-- recovery windows (for example 01:00-04:00 and then 06:00-08:00).
--
-- What changes:
-- 1) Adds a hard rest constraint: at least 8 hours between any two assignments.
-- 2) Fixes PASS 1 to truly prefer guards with no assignment on the same day.
-- 3) Keeps PASS 2 fallback, but only among guards that still pass the rest rule.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rpc_auto_assign(
  p_user_id TEXT,
  p_phone TEXT,
  p_camp_id INT,
  p_start_ts BIGINT,
  p_end_ts BIGINT,
  p_outpost_ids INT[] DEFAULT NULL
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day DATE;
  v_end_day DATE;
  v_day_ts BIGINT;
  v_dow INT;
  v_shift_day_id INT;

  v_shift RECORD;
  v_min_guards INT;
  v_already INT;
  v_guard RECORD;
  v_assigned INT[];
  v_new_row public.shibuts;
  v_needed INT;
  v_existing_ids INT[];

  v_candidate_start_ms BIGINT;
  v_candidate_end_ms BIGINT;
  v_min_rest_ms BIGINT := (8 * 60 * 60 * 1000)::BIGINT;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);

  v_day := DATE(timezone('UTC', to_timestamp(p_start_ts / 1000.0)));
  v_end_day := DATE(timezone('UTC', to_timestamp(p_end_ts / 1000.0)));

  WHILE v_day <= v_end_day LOOP
    v_day_ts := EXTRACT(EPOCH FROM v_day AT TIME ZONE 'UTC')::BIGINT * 1000;
    v_dow := EXTRACT(DOW FROM v_day)::INT;
    v_shift_day_id := v_dow + 1;

    FOR v_shift IN
      SELECT
        s.id AS shift_id,
        s."outpostId" AS outpost_id,
        s."fromHour" AS from_hour,
        s."toHour" AS to_hour,
        COALESCE(o."minGuards", 1) AS min_guards
      FROM public.shifts s
      JOIN public.outposts o ON o.id = s."outpostId"
      WHERE s."dayId" = v_shift_day_id
        AND o."campId" = p_camp_id
        AND (p_outpost_ids IS NULL OR o.id = ANY(p_outpost_ids))
      ORDER BY s."outpostId", s."fromHour"
    LOOP
      v_min_guards := v_shift.min_guards;

      v_candidate_start_ms := v_day_ts + (v_shift.from_hour * 60 * 60 * 1000)::BIGINT;
      v_candidate_end_ms := v_day_ts + (v_shift.to_hour * 60 * 60 * 1000)::BIGINT;
      IF v_shift.to_hour <= v_shift.from_hour THEN
        v_candidate_end_ms := v_candidate_end_ms + (24 * 60 * 60 * 1000)::BIGINT;
      END IF;

      SELECT COUNT(*) INTO v_already
      FROM public.shibuts
      WHERE "shiftId" = v_shift.shift_id
        AND "campId" = p_camp_id
        AND "theDate" = v_day_ts;

      CONTINUE WHEN v_already >= v_min_guards;

      SELECT ARRAY_AGG("guardId") INTO v_existing_ids
      FROM public.shibuts
      WHERE "shiftId" = v_shift.shift_id
        AND "campId" = p_camp_id
        AND "theDate" = v_day_ts;
      v_existing_ids := COALESCE(v_existing_ids, ARRAY[]::INT[]);

      v_assigned := ARRAY[]::INT[];
      v_needed := v_min_guards - v_already;

      -- PASS 1: prefer guards with NO assignment on this day.
      FOR v_guard IN
        SELECT g.id
        FROM public.guards g
        WHERE g."campId" = p_camp_id
          AND g."shouldBeAllocated" = true
          AND g.id NOT IN (
            SELECT "guardId"
            FROM public.guard_day_limits
            WHERE "dayId" = v_dow
          )
          AND g.id NOT IN (
            SELECT "guardId"
            FROM public.guard_time_limits
            WHERE "dayId" = v_dow
              AND NOT ("toHour" <= v_shift.from_hour OR "fromHour" >= v_shift.to_hour)
          )
          AND g.id NOT IN (
            SELECT "guardId"
            FROM public.guard_outpost_limits
            WHERE "outpostId" = v_shift.outpost_id
          )
          AND g.id <> ALL(v_existing_ids)
          AND g.id NOT IN (
            SELECT sh2."guardId"
            FROM public.shibuts sh2
            WHERE sh2."campId" = p_camp_id
              AND sh2."theDate" = v_day_ts
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.shibuts sh2
            JOIN public.shifts s2 ON s2.id = sh2."shiftId"
            WHERE sh2."campId" = p_camp_id
              AND sh2."guardId" = g.id
              AND NOT (
                (
                  sh2."theDate" + (
                    COALESCE(
                      sh2."endMinute",
                      CASE
                        WHEN s2."toHour" > s2."fromHour" THEN s2."toHour" * 60
                        ELSE s2."toHour" * 60 + 1440
                      END
                    ) * 60000
                  )::BIGINT
                ) <= (v_candidate_start_ms - v_min_rest_ms)
                OR
                (
                  sh2."theDate" + (
                    COALESCE(sh2."startMinute", s2."fromHour" * 60) * 60000
                  )::BIGINT
                ) >= (v_candidate_end_ms + v_min_rest_ms)
              )
          )
        ORDER BY (
          SELECT COUNT(*)
          FROM public.shibuts s2
          WHERE s2."guardId" = g.id
            AND s2."campId" = p_camp_id
            AND s2."theDate" >= p_start_ts
            AND s2."theDate" <= p_end_ts
        ) ASC, g.id ASC
      LOOP
        EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

        IF array_length(v_assigned, 1) > 0 AND EXISTS (
          SELECT 1
          FROM public.guard_peer_exclusions
          WHERE ("guardId" = v_guard.id AND "excludedGuardId" = ANY(v_existing_ids || v_assigned))
             OR ("guardId" = ANY(v_existing_ids || v_assigned) AND "excludedGuardId" = v_guard.id)
        ) THEN
          CONTINUE;
        END IF;

        INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
        VALUES (v_guard.id, v_shift.shift_id, v_shift.outpost_id, p_camp_id, v_day_ts)
        RETURNING * INTO v_new_row;

        v_assigned := v_assigned || v_guard.id;
        RETURN NEXT v_new_row;
      END LOOP;

      -- PASS 2: allow guards already assigned that day, still enforcing rest.
      IF COALESCE(array_length(v_assigned, 1), 0) < v_needed THEN
        FOR v_guard IN
          SELECT g.id
          FROM public.guards g
          WHERE g."campId" = p_camp_id
            AND g."shouldBeAllocated" = true
            AND g.id NOT IN (
              SELECT "guardId"
              FROM public.guard_day_limits
              WHERE "dayId" = v_dow
            )
            AND g.id NOT IN (
              SELECT "guardId"
              FROM public.guard_time_limits
              WHERE "dayId" = v_dow
                AND NOT ("toHour" <= v_shift.from_hour OR "fromHour" >= v_shift.to_hour)
            )
            AND g.id NOT IN (
              SELECT "guardId"
              FROM public.guard_outpost_limits
              WHERE "outpostId" = v_shift.outpost_id
            )
            AND g.id <> ALL(v_existing_ids)
            AND g.id <> ALL(v_assigned)
            AND NOT EXISTS (
              SELECT 1
              FROM public.shibuts sh2
              JOIN public.shifts s2 ON s2.id = sh2."shiftId"
              WHERE sh2."campId" = p_camp_id
                AND sh2."guardId" = g.id
                AND NOT (
                  (
                    sh2."theDate" + (
                      COALESCE(
                        sh2."endMinute",
                        CASE
                          WHEN s2."toHour" > s2."fromHour" THEN s2."toHour" * 60
                          ELSE s2."toHour" * 60 + 1440
                        END
                      ) * 60000
                    )::BIGINT
                  ) <= (v_candidate_start_ms - v_min_rest_ms)
                  OR
                  (
                    sh2."theDate" + (
                      COALESCE(sh2."startMinute", s2."fromHour" * 60) * 60000
                    )::BIGINT
                  ) >= (v_candidate_end_ms + v_min_rest_ms)
                )
            )
          ORDER BY
            (
              SELECT MIN(
                LEAST(
                  ABS(
                    v_candidate_start_ms - (
                      sh3."theDate" + (
                        COALESCE(
                          sh3."endMinute",
                          CASE
                            WHEN s3."toHour" > s3."fromHour" THEN s3."toHour" * 60
                            ELSE s3."toHour" * 60 + 1440
                          END
                        ) * 60000
                      )::BIGINT
                    )
                  ),
                  ABS(
                    (
                      sh3."theDate" + (
                        COALESCE(sh3."startMinute", s3."fromHour" * 60) * 60000
                      )::BIGINT
                    ) - v_candidate_end_ms
                  )
                )
              )
              FROM public.shibuts sh3
              JOIN public.shifts s3 ON s3.id = sh3."shiftId"
              WHERE sh3."guardId" = g.id
                AND sh3."campId" = p_camp_id
            ) DESC NULLS LAST,
            (
              SELECT COUNT(*)
              FROM public.shibuts s2
              WHERE s2."guardId" = g.id
                AND s2."campId" = p_camp_id
                AND s2."theDate" >= p_start_ts
                AND s2."theDate" <= p_end_ts
            ) ASC,
            g.id ASC
        LOOP
          EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

          IF EXISTS (
            SELECT 1
            FROM public.guard_peer_exclusions
            WHERE ("guardId" = v_guard.id AND "excludedGuardId" = ANY(v_existing_ids || v_assigned))
               OR ("guardId" = ANY(v_existing_ids || v_assigned) AND "excludedGuardId" = v_guard.id)
          ) THEN
            CONTINUE;
          END IF;

          INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
          VALUES (v_guard.id, v_shift.shift_id, v_shift.outpost_id, p_camp_id, v_day_ts)
          RETURNING * INTO v_new_row;

          v_assigned := v_assigned || v_guard.id;
          RETURN NEXT v_new_row;
        END LOOP;
      END IF;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.rpc_auto_assign(TEXT, TEXT, INT, BIGINT, BIGINT, INT[])
IS 'Auto assign guards for date range with hard minimum rest gap of 8 hours.';
