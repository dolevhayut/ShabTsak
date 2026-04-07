-- ============================================
-- שיבוץ רנדומלי של חיילים למשמרות
-- שבוע: 05-11 באפריל 2026
-- dayId 1=ראשון ... 7=שבת
-- theDate = epoch-ms של חצות UTC של כל יום
-- ============================================

-- ניקוי שיבוצים ישנים (אם יש)
TRUNCATE public.shibuts RESTART IDENTITY CASCADE;

DO $$
DECLARE
  rec          RECORD;
  v_guard_ids  INT[] := ARRAY[1,2,3,4,5,6,7,8,9,10,11];
  v_date_epoch BIGINT;
  v_base_date  DATE := '2026-04-05'; -- ראשון של השבוע
  v_guard_idx1 INT;
  v_guard_idx2 INT;
BEGIN
  FOR rec IN
    SELECT s.id AS shift_id, s."dayId", s."outpostId"
    FROM   public.shifts s
    JOIN   public.outposts o ON o.id = s."outpostId"
    WHERE  o."campId" = 1
    ORDER  BY s."outpostId", s."dayId", s."fromHour"
  LOOP
    -- חישוב timestamp של היום (dayId 1=ראשון)
    v_date_epoch := EXTRACT(EPOCH FROM (v_base_date + ((rec."dayId" - 1) * INTERVAL '1 day')))::BIGINT * 1000;

    -- חייל ראשון (תמיד)
    v_guard_idx1 := (FLOOR(RANDOM() * array_length(v_guard_ids, 1)) + 1)::INT;

    INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
    VALUES (
      v_guard_ids[v_guard_idx1],
      rec.shift_id,
      rec."outpostId",
      1,
      v_date_epoch
    );

    -- לש.ג ראשי – חייל שני בהסתברות 70%
    IF rec."outpostId" = 1 AND RANDOM() < 0.7 THEN
      -- בחר חייל שונה
      LOOP
        v_guard_idx2 := (FLOOR(RANDOM() * array_length(v_guard_ids, 1)) + 1)::INT;
        EXIT WHEN v_guard_idx2 <> v_guard_idx1;
      END LOOP;

      INSERT INTO public.shibuts ("guardId", "shiftId", "outpostId", "campId", "theDate")
      VALUES (
        v_guard_ids[v_guard_idx2],
        rec.shift_id,
        rec."outpostId",
        1,
        v_date_epoch
      );
    END IF;
  END LOOP;
END $$;

-- סיכום
SELECT
  o.name                                AS outpost,
  COUNT(*)                              AS total_shibuts,
  COUNT(DISTINCT sb."guardId")          AS unique_guards
FROM public.shibuts sb
JOIN public.outposts o ON o.id = sb."outpostId"
GROUP BY o.name
ORDER BY o.name;
