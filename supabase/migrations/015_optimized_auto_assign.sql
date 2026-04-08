-- ============================================================
-- Optimized auto-assign v3: best-of-N internal iterations
-- ============================================================
-- The function runs the assignment algorithm up to 20 times,
-- scoring each attempt. It keeps the best result and only
-- INSERTs it into shibuts at the end.
--
-- Scoring criteria (lower = better):
--   penalty += worst_max_slot_count (per guard per time-slot)
--   penalty += consecutive_same_slot_count
--   penalty += fairness_range (max - min total shifts, excl restricted guards)
-- ============================================================

-- Helper: scoring function for a candidate set
CREATE OR REPLACE FUNCTION public._auto_assign_score(
  p_camp_id   INT,
  p_start_ts  BIGINT,
  p_end_ts    BIGINT,
  p_attempt   INT
) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  v_max_slot    INT;
  v_consec      INT;
  v_fair_range  INT;
  v_unfilled    INT;
  v_penalty     NUMERIC := 0;
BEGIN
  -- 1) Worst max same slot count across all guards
  SELECT COALESCE(MAX(slot_cnt), 0) INTO v_max_slot
  FROM (
    SELECT c."guardId", s."fromHour", s."toHour", COUNT(*) AS slot_cnt
    FROM   _auto_assign_candidates c
    JOIN   public.shifts s ON s.id = c."shiftId"
    WHERE  c.attempt = p_attempt
    GROUP BY c."guardId", s."fromHour", s."toHour"
  ) t;

  -- 2) Consecutive same-slot: guard assigned to same fromHour-toHour on consecutive days
  SELECT COALESCE(COUNT(*), 0) INTO v_consec
  FROM (
    SELECT c."guardId", s."fromHour", s."toHour", c."theDate",
           LAG(c."theDate") OVER (PARTITION BY c."guardId" ORDER BY c."theDate", c.id) AS prev_date,
           LAG(s."fromHour") OVER (PARTITION BY c."guardId" ORDER BY c."theDate", c.id) AS prev_from,
           LAG(s."toHour") OVER (PARTITION BY c."guardId" ORDER BY c."theDate", c.id) AS prev_to
    FROM   _auto_assign_candidates c
    JOIN   public.shifts s ON s.id = c."shiftId"
    WHERE  c.attempt = p_attempt
  ) t
  WHERE t."fromHour" = t.prev_from
    AND t."toHour" = t.prev_to
    AND t."theDate" - t.prev_date <= 86400000;

  -- 3) Fairness range (excluding guards with day limits)
  SELECT COALESCE(MAX(cnt) - MIN(cnt), 0) INTO v_fair_range
  FROM (
    SELECT c."guardId", COUNT(*) AS cnt
    FROM   _auto_assign_candidates c
    WHERE  c.attempt = p_attempt
      AND  NOT EXISTS (
        SELECT 1 FROM public.guard_day_limits WHERE "guardId" = c."guardId"
      )
    GROUP BY c."guardId"
  ) t;

  v_penalty := v_max_slot * 100 + v_consec * 10 + v_fair_range;

  RETURN v_penalty;
END;
$$;


CREATE OR REPLACE FUNCTION public.rpc_auto_assign(
  p_user_id    TEXT,
  p_phone      TEXT,
  p_camp_id    INT,
  p_start_ts   BIGINT,
  p_end_ts     BIGINT,
  p_outpost_ids INT[] DEFAULT NULL
) RETURNS SETOF public.shibuts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max_attempts  INT := 20;
  v_target_score  NUMERIC := 410;  -- max_slot<=4 (400) + consec<=1 (10) + fair<=0
  v_attempt       INT;
  v_best_attempt  INT := 1;
  v_best_score    NUMERIC := 999999;
  v_current_score NUMERIC;

  v_day          DATE;
  v_end_day      DATE;
  v_day_ts       BIGINT;
  v_dow          INT;
  v_shift_day_id INT;

  v_shift        RECORD;
  v_min_guards   INT;
  v_already      INT;
  v_guard        RECORD;
  v_assigned     INT[];
  v_needed       INT;
  v_existing_ids INT[];

  v_candidate_start_ms BIGINT;
  v_candidate_end_ms   BIGINT;
  v_min_rest_hours     NUMERIC;
  v_min_rest_ms        BIGINT;
  v_lookback_ts        BIGINT;
  v_slot_cap           INT := 5;
  v_allow_over_cap     BOOLEAN;
  v_new_row            public.shibuts;
BEGIN
  PERFORM public.assert_commander(p_user_id, p_phone);

  -- Get rest config
  SELECT COALESCE(cs.min_rest_hours, 8.0)
  INTO v_min_rest_hours
  FROM public.camp_settings cs
  WHERE cs.camp_id = p_camp_id;
  v_min_rest_hours := COALESCE(v_min_rest_hours, 8.0);
  v_min_rest_ms    := (v_min_rest_hours * 60 * 60 * 1000)::BIGINT;
  v_lookback_ts    := p_start_ts - (30::BIGINT * 86400000);

  v_day     := DATE(timezone('UTC', to_timestamp(p_start_ts / 1000.0)));
  v_end_day := DATE(timezone('UTC', to_timestamp(p_end_ts   / 1000.0)));

  -- Create temp table for candidate assignments
  CREATE TEMP TABLE IF NOT EXISTS _auto_assign_candidates (
    id         SERIAL,
    attempt    INT,
    "guardId"  INT,
    "shiftId"  INT,
    "outpostId" INT,
    "campId"   INT,
    "theDate"  BIGINT
  ) ON COMMIT DROP;

  DELETE FROM _auto_assign_candidates;

  -- ══════════════════════════════════════════════
  -- Main loop: try up to v_max_attempts times
  -- ══════════════════════════════════════════════
  FOR v_attempt IN 1..v_max_attempts LOOP

    v_day := DATE(timezone('UTC', to_timestamp(p_start_ts / 1000.0)));

    WHILE v_day <= v_end_day LOOP
      v_day_ts       := EXTRACT(EPOCH FROM v_day AT TIME ZONE 'UTC')::BIGINT * 1000;
      v_dow          := EXTRACT(DOW FROM v_day)::INT;
      v_shift_day_id := v_dow + 1;

      -- Process shifts in RANDOM order (key to diversity)
      FOR v_shift IN
        SELECT
          s.id          AS shift_id,
          s."outpostId" AS outpost_id,
          s."fromHour"  AS from_hour,
          s."toHour"    AS to_hour,
          COALESCE(o."minGuards", 1) AS min_guards
        FROM   public.shifts s
        JOIN   public.outposts o ON o.id = s."outpostId"
        WHERE  s."dayId" = v_shift_day_id
          AND  o."campId" = p_camp_id
          AND  (p_outpost_ids IS NULL OR o.id = ANY(p_outpost_ids))
        ORDER BY random()
      LOOP
        v_min_guards := v_shift.min_guards;

        v_candidate_start_ms := v_day_ts + (v_shift.from_hour * 60 * 60 * 1000)::BIGINT;
        v_candidate_end_ms   := v_day_ts + (v_shift.to_hour   * 60 * 60 * 1000)::BIGINT;
        IF v_shift.to_hour <= v_shift.from_hour THEN
          v_candidate_end_ms := v_candidate_end_ms + (24 * 60 * 60 * 1000)::BIGINT;
        END IF;

        -- Count existing real assignments (manual ones we don't overwrite)
        SELECT COUNT(*) INTO v_already
        FROM   public.shibuts
        WHERE  "shiftId" = v_shift.shift_id
          AND  "campId"  = p_camp_id
          AND  "theDate" = v_day_ts;

        -- Also count this attempt's candidates for this slot
        v_already := v_already + (
          SELECT COUNT(*) FROM _auto_assign_candidates
          WHERE  attempt   = v_attempt
            AND  "shiftId" = v_shift.shift_id
            AND  "campId"  = p_camp_id
            AND  "theDate" = v_day_ts
        );

        CONTINUE WHEN v_already >= v_min_guards;

        SELECT ARRAY_AGG("guardId") INTO v_existing_ids
        FROM (
          SELECT "guardId" FROM public.shibuts
          WHERE  "shiftId" = v_shift.shift_id AND "campId" = p_camp_id AND "theDate" = v_day_ts
          UNION ALL
          SELECT "guardId" FROM _auto_assign_candidates
          WHERE  attempt = v_attempt AND "shiftId" = v_shift.shift_id AND "campId" = p_camp_id AND "theDate" = v_day_ts
        ) combined;
        v_existing_ids := COALESCE(v_existing_ids, ARRAY[]::INT[]);

        v_assigned := ARRAY[]::INT[];
        v_needed   := v_min_guards - v_already;

        -- ── PASS 1: prefer guards with NO assignment on this day ──
        FOR v_allow_over_cap IN VALUES (false), (true) LOOP
          EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

          FOR v_guard IN
            SELECT g.id
            FROM   public.guards g
            WHERE  g."campId" = p_camp_id
              AND  g."shouldBeAllocated" = true
              AND  g.id <> ALL(v_existing_ids)
              AND  g.id NOT IN (SELECT "guardId" FROM public.guard_day_limits WHERE "dayId" = v_dow)
              AND  g.id NOT IN (
                     SELECT "guardId" FROM public.guard_time_limits
                     WHERE  "dayId" = v_dow
                       AND  NOT ("toHour" <= v_shift.from_hour OR "fromHour" >= v_shift.to_hour)
                   )
              AND  g.id NOT IN (
                     SELECT "guardId" FROM public.guard_outpost_limits
                     WHERE  "outpostId" = v_shift.outpost_id
                   )
              -- No assignment this day (real + candidates)
              AND  g.id NOT IN (
                     SELECT "guardId" FROM public.shibuts
                     WHERE  "campId" = p_camp_id AND "theDate" = v_day_ts
                   )
              AND  g.id NOT IN (
                     SELECT "guardId" FROM _auto_assign_candidates
                     WHERE  attempt = v_attempt AND "campId" = p_camp_id AND "theDate" = v_day_ts
                   )
              -- Hard rest constraint (against real shibuts)
              AND  NOT EXISTS (
                     SELECT 1
                     FROM   public.shibuts sh2
                     JOIN   public.shifts  s2 ON s2.id = sh2."shiftId"
                     WHERE  sh2."campId" = p_camp_id AND sh2."guardId" = g.id
                       AND  NOT (
                              (sh2."theDate" + (COALESCE(sh2."endMinute",
                                CASE WHEN s2."toHour" > s2."fromHour" THEN s2."toHour"*60
                                     ELSE s2."toHour"*60+1440 END) * 60000)::BIGINT)
                              <= (v_candidate_start_ms - v_min_rest_ms)
                              OR
                              (sh2."theDate" + (COALESCE(sh2."startMinute", s2."fromHour"*60) * 60000)::BIGINT)
                              >= (v_candidate_end_ms + v_min_rest_ms)
                            )
                   )
              -- Hard rest constraint (against this attempt's candidates)
              AND  NOT EXISTS (
                     SELECT 1
                     FROM   _auto_assign_candidates c2
                     JOIN   public.shifts s2 ON s2.id = c2."shiftId"
                     WHERE  c2.attempt = v_attempt AND c2."campId" = p_camp_id AND c2."guardId" = g.id
                       AND  NOT (
                              (c2."theDate" + (
                                CASE WHEN s2."toHour" > s2."fromHour" THEN s2."toHour"*60
                                     ELSE s2."toHour"*60+1440 END * 60000)::BIGINT)
                              <= (v_candidate_start_ms - v_min_rest_ms)
                              OR
                              (c2."theDate" + (s2."fromHour"*60*60000)::BIGINT)
                              >= (v_candidate_end_ms + v_min_rest_ms)
                            )
                   )
              -- Slot cap
              AND  (
                v_allow_over_cap
                OR (
                  SELECT COUNT(*)
                  FROM (
                    SELECT 1 FROM public.shibuts sh_c
                    JOIN   public.shifts s_c ON s_c.id = sh_c."shiftId"
                    WHERE  sh_c."guardId" = g.id AND sh_c."campId" = p_camp_id
                      AND  s_c."fromHour" = v_shift.from_hour AND s_c."toHour" = v_shift.to_hour
                      AND  sh_c."theDate" >= v_lookback_ts AND sh_c."theDate" <= p_end_ts
                    UNION ALL
                    SELECT 1 FROM _auto_assign_candidates c_c
                    JOIN   public.shifts s_c ON s_c.id = c_c."shiftId"
                    WHERE  c_c.attempt = v_attempt AND c_c."guardId" = g.id AND c_c."campId" = p_camp_id
                      AND  s_c."fromHour" = v_shift.from_hour AND s_c."toHour" = v_shift.to_hour
                  ) combined_cap
                ) < v_slot_cap
              )
            ORDER BY
              -- 1) Was last assignment (in this attempt) the same slot?
              (
                SELECT COUNT(*) FROM (
                  SELECT s_r."fromHour", s_r."toHour"
                  FROM   _auto_assign_candidates c_r
                  JOIN   public.shifts s_r ON s_r.id = c_r."shiftId"
                  WHERE  c_r.attempt = v_attempt AND c_r."guardId" = g.id AND c_r."campId" = p_camp_id
                  ORDER BY c_r."theDate" DESC, c_r.id DESC
                  LIMIT 1
                ) last_asn
                WHERE last_asn."fromHour" = v_shift.from_hour AND last_asn."toHour" = v_shift.to_hour
              ) ASC,
              -- 2) How many of last 3 assignments were this slot?
              (
                SELECT COUNT(*) FROM (
                  SELECT s_r."fromHour", s_r."toHour"
                  FROM   _auto_assign_candidates c_r
                  JOIN   public.shifts s_r ON s_r.id = c_r."shiftId"
                  WHERE  c_r.attempt = v_attempt AND c_r."guardId" = g.id AND c_r."campId" = p_camp_id
                  ORDER BY c_r."theDate" DESC, c_r.id DESC
                  LIMIT 3
                ) recent WHERE recent."fromHour" = v_shift.from_hour AND recent."toHour" = v_shift.to_hour
              ) ASC,
              -- 3) Total times this slot (real + candidates)
              (
                SELECT COUNT(*) FROM (
                  SELECT 1 FROM public.shibuts sh_t JOIN public.shifts s_t ON s_t.id = sh_t."shiftId"
                  WHERE sh_t."guardId" = g.id AND sh_t."campId" = p_camp_id
                    AND s_t."fromHour" = v_shift.from_hour AND s_t."toHour" = v_shift.to_hour
                    AND sh_t."theDate" >= v_lookback_ts AND sh_t."theDate" <= p_end_ts
                  UNION ALL
                  SELECT 1 FROM _auto_assign_candidates c_t JOIN public.shifts s_t ON s_t.id = c_t."shiftId"
                  WHERE c_t.attempt = v_attempt AND c_t."guardId" = g.id AND c_t."campId" = p_camp_id
                    AND s_t."fromHour" = v_shift.from_hour AND s_t."toHour" = v_shift.to_hour
                ) combined_ts
              ) ASC,
              -- 4) Total assignments (fairness)
              (
                SELECT COUNT(*) FROM public.shibuts s2
                WHERE s2."guardId" = g.id AND s2."campId" = p_camp_id
                  AND s2."theDate" >= v_lookback_ts AND s2."theDate" <= p_end_ts
              ) + (
                SELECT COUNT(*) FROM _auto_assign_candidates c2
                WHERE c2.attempt = v_attempt AND c2."guardId" = g.id AND c2."campId" = p_camp_id
              ) ASC,
              -- 5) Outpost diversity
              (
                SELECT COUNT(*) FROM public.shibuts s3
                WHERE s3."guardId" = g.id AND s3."campId" = p_camp_id AND s3."outpostId" = v_shift.outpost_id
                  AND s3."theDate" >= v_lookback_ts AND s3."theDate" <= p_end_ts
              ) + (
                SELECT COUNT(*) FROM _auto_assign_candidates c3
                WHERE c3.attempt = v_attempt AND c3."guardId" = g.id AND c3."campId" = p_camp_id
                  AND c3."outpostId" = v_shift.outpost_id
              ) ASC,
              -- 6) Random tiebreak
              random()
          LOOP
            EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

            IF array_length(v_assigned, 1) > 0 AND EXISTS (
              SELECT 1 FROM public.guard_peer_exclusions
              WHERE ("guardId" = v_guard.id AND "excludedGuardId" = ANY(v_existing_ids || v_assigned))
                 OR ("guardId" = ANY(v_existing_ids || v_assigned) AND "excludedGuardId" = v_guard.id)
            ) THEN CONTINUE; END IF;

            INSERT INTO _auto_assign_candidates (attempt, "guardId", "shiftId", "outpostId", "campId", "theDate")
            VALUES (v_attempt, v_guard.id, v_shift.shift_id, v_shift.outpost_id, p_camp_id, v_day_ts);

            v_assigned := v_assigned || v_guard.id;
          END LOOP;
        END LOOP;  -- slot cap sub-passes

        -- ── PASS 2: allow guards already assigned that day ──
        IF COALESCE(array_length(v_assigned, 1), 0) < v_needed THEN
          -- re-fetch existing ids with what we just added
          SELECT ARRAY_AGG("guardId") INTO v_existing_ids
          FROM (
            SELECT "guardId" FROM public.shibuts
            WHERE  "shiftId" = v_shift.shift_id AND "campId" = p_camp_id AND "theDate" = v_day_ts
            UNION ALL
            SELECT "guardId" FROM _auto_assign_candidates
            WHERE  attempt = v_attempt AND "shiftId" = v_shift.shift_id AND "campId" = p_camp_id AND "theDate" = v_day_ts
          ) combined;
          v_existing_ids := COALESCE(v_existing_ids, ARRAY[]::INT[]);

          FOR v_allow_over_cap IN VALUES (false), (true) LOOP
            EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

            FOR v_guard IN
              SELECT g.id
              FROM   public.guards g
              WHERE  g."campId" = p_camp_id
                AND  g."shouldBeAllocated" = true
                AND  g.id <> ALL(v_existing_ids)
                AND  g.id <> ALL(v_assigned)
                AND  g.id NOT IN (SELECT "guardId" FROM public.guard_day_limits WHERE "dayId" = v_dow)
                AND  g.id NOT IN (
                       SELECT "guardId" FROM public.guard_time_limits
                       WHERE  "dayId" = v_dow
                         AND  NOT ("toHour" <= v_shift.from_hour OR "fromHour" >= v_shift.to_hour)
                     )
                AND  g.id NOT IN (
                       SELECT "guardId" FROM public.guard_outpost_limits
                       WHERE  "outpostId" = v_shift.outpost_id
                     )
                AND  NOT EXISTS (
                       SELECT 1
                       FROM   public.shibuts sh2
                       JOIN   public.shifts  s2 ON s2.id = sh2."shiftId"
                       WHERE  sh2."campId" = p_camp_id AND sh2."guardId" = g.id
                         AND  NOT (
                                (sh2."theDate" + (COALESCE(sh2."endMinute",
                                  CASE WHEN s2."toHour" > s2."fromHour" THEN s2."toHour"*60
                                       ELSE s2."toHour"*60+1440 END) * 60000)::BIGINT)
                                <= (v_candidate_start_ms - v_min_rest_ms)
                                OR
                                (sh2."theDate" + (COALESCE(sh2."startMinute", s2."fromHour"*60) * 60000)::BIGINT)
                                >= (v_candidate_end_ms + v_min_rest_ms)
                              )
                     )
                AND  NOT EXISTS (
                       SELECT 1
                       FROM   _auto_assign_candidates c2
                       JOIN   public.shifts s2 ON s2.id = c2."shiftId"
                       WHERE  c2.attempt = v_attempt AND c2."campId" = p_camp_id AND c2."guardId" = g.id
                         AND  NOT (
                                (c2."theDate" + (
                                  CASE WHEN s2."toHour" > s2."fromHour" THEN s2."toHour"*60
                                       ELSE s2."toHour"*60+1440 END * 60000)::BIGINT)
                                <= (v_candidate_start_ms - v_min_rest_ms)
                                OR
                                (c2."theDate" + (s2."fromHour"*60*60000)::BIGINT)
                                >= (v_candidate_end_ms + v_min_rest_ms)
                              )
                     )
                AND  (
                  v_allow_over_cap
                  OR (
                    SELECT COUNT(*) FROM (
                      SELECT 1 FROM public.shibuts sh_c JOIN public.shifts s_c ON s_c.id = sh_c."shiftId"
                      WHERE sh_c."guardId" = g.id AND sh_c."campId" = p_camp_id
                        AND s_c."fromHour" = v_shift.from_hour AND s_c."toHour" = v_shift.to_hour
                        AND sh_c."theDate" >= v_lookback_ts AND sh_c."theDate" <= p_end_ts
                      UNION ALL
                      SELECT 1 FROM _auto_assign_candidates c_c JOIN public.shifts s_c ON s_c.id = c_c."shiftId"
                      WHERE c_c.attempt = v_attempt AND c_c."guardId" = g.id AND c_c."campId" = p_camp_id
                        AND s_c."fromHour" = v_shift.from_hour AND s_c."toHour" = v_shift.to_hour
                    ) combined_cap
                  ) < v_slot_cap
                )
              ORDER BY
                (SELECT COUNT(*) FROM (
                  SELECT s_r."fromHour", s_r."toHour"
                  FROM _auto_assign_candidates c_r JOIN public.shifts s_r ON s_r.id = c_r."shiftId"
                  WHERE c_r.attempt = v_attempt AND c_r."guardId" = g.id AND c_r."campId" = p_camp_id
                  ORDER BY c_r."theDate" DESC, c_r.id DESC LIMIT 1
                ) x WHERE x."fromHour" = v_shift.from_hour AND x."toHour" = v_shift.to_hour) ASC,
                (SELECT COUNT(*) FROM (
                  SELECT s_r."fromHour", s_r."toHour"
                  FROM _auto_assign_candidates c_r JOIN public.shifts s_r ON s_r.id = c_r."shiftId"
                  WHERE c_r.attempt = v_attempt AND c_r."guardId" = g.id AND c_r."campId" = p_camp_id
                  ORDER BY c_r."theDate" DESC, c_r.id DESC LIMIT 3
                ) x WHERE x."fromHour" = v_shift.from_hour AND x."toHour" = v_shift.to_hour) ASC,
                (SELECT COUNT(*) FROM (
                  SELECT 1 FROM public.shibuts sh_t JOIN public.shifts s_t ON s_t.id = sh_t."shiftId"
                  WHERE sh_t."guardId" = g.id AND sh_t."campId" = p_camp_id
                    AND s_t."fromHour" = v_shift.from_hour AND s_t."toHour" = v_shift.to_hour
                    AND sh_t."theDate" >= v_lookback_ts AND sh_t."theDate" <= p_end_ts
                  UNION ALL
                  SELECT 1 FROM _auto_assign_candidates c_t JOIN public.shifts s_t ON s_t.id = c_t."shiftId"
                  WHERE c_t.attempt = v_attempt AND c_t."guardId" = g.id AND c_t."campId" = p_camp_id
                    AND s_t."fromHour" = v_shift.from_hour AND s_t."toHour" = v_shift.to_hour
                ) x) ASC,
                (SELECT COUNT(*) FROM public.shibuts s2
                  WHERE s2."guardId" = g.id AND s2."campId" = p_camp_id
                    AND s2."theDate" >= v_lookback_ts AND s2."theDate" <= p_end_ts
                ) + (SELECT COUNT(*) FROM _auto_assign_candidates c2
                  WHERE c2.attempt = v_attempt AND c2."guardId" = g.id AND c2."campId" = p_camp_id
                ) ASC,
                (SELECT COUNT(*) FROM public.shibuts s3
                  WHERE s3."guardId" = g.id AND s3."campId" = p_camp_id AND s3."outpostId" = v_shift.outpost_id
                    AND s3."theDate" >= v_lookback_ts AND s3."theDate" <= p_end_ts
                ) + (SELECT COUNT(*) FROM _auto_assign_candidates c3
                  WHERE c3.attempt = v_attempt AND c3."guardId" = g.id AND c3."campId" = p_camp_id
                    AND c3."outpostId" = v_shift.outpost_id
                ) ASC,
                random()
            LOOP
              EXIT WHEN COALESCE(array_length(v_assigned, 1), 0) >= v_needed;

              IF EXISTS (
                SELECT 1 FROM public.guard_peer_exclusions
                WHERE ("guardId" = v_guard.id AND "excludedGuardId" = ANY(v_existing_ids || v_assigned))
                   OR ("guardId" = ANY(v_existing_ids || v_assigned) AND "excludedGuardId" = v_guard.id)
              ) THEN CONTINUE; END IF;

              INSERT INTO _auto_assign_candidates (attempt, "guardId", "shiftId", "outpostId", "campId", "theDate")
              VALUES (v_attempt, v_guard.id, v_shift.shift_id, v_shift.outpost_id, p_camp_id, v_day_ts);

              v_assigned := v_assigned || v_guard.id;
            END LOOP;
          END LOOP;
        END IF;

      END LOOP;  -- shifts
      v_day := v_day + 1;
    END LOOP;  -- days

    -- Score this attempt
    v_current_score := public._auto_assign_score(p_camp_id, p_start_ts, p_end_ts, v_attempt);

    IF v_current_score < v_best_score THEN
      v_best_score   := v_current_score;
      v_best_attempt := v_attempt;
    END IF;

    -- Early exit if score is excellent
    EXIT WHEN v_best_score <= v_target_score;

  END LOOP;  -- attempts

  -- ══════════════════════════════════════════════
  -- INSERT the best attempt into shibuts
  -- ══════════════════════════════════════════════
  FOR v_new_row IN
    INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
    SELECT "guardId", "shiftId", "outpostId", "campId", "theDate"
    FROM   _auto_assign_candidates
    WHERE  attempt = v_best_attempt
    ORDER BY "theDate", id
    RETURNING *
  LOOP
    RETURN NEXT v_new_row;
  END LOOP;

  DROP TABLE IF EXISTS _auto_assign_candidates;
END;
$$;

COMMENT ON FUNCTION public.rpc_auto_assign(TEXT, TEXT, INT, BIGINT, BIGINT, INT[])
IS 'Best-of-N auto-assign: runs up to 20 iterations with shuffled shift order, slot cap, consecutive avoidance, and recency penalty. Picks the best scoring result.';
