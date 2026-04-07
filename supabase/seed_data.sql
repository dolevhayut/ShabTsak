-- ============================================
-- מושב גורן – נתוני אתחול מלאים
-- ============================================

-- עדכון שם עמדה 1 + הוספת חמ"ל
UPDATE public.outposts SET name = 'ש.ג ראשי' WHERE id = 1;

INSERT INTO public.outposts (name, "campId", "minGuards")
VALUES ('חמ"ל', 1, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 10 חיילים (+ מפקד קיים = guard id 1)
-- ============================================
INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId", color)
VALUES
  ('יובל כהן',    'yuval@goren.il',  '0501111001', true, 1, '#2563EB'),
  ('אורי לוי',    'uri@goren.il',    '0501111002', true, 1, '#16A34A'),
  ('נועם מזרחי',  'noam@goren.il',   '0501111003', true, 1, '#DC2626'),
  ('תום פרץ',     'tom@goren.il',    '0501111004', true, 1, '#D97706'),
  ('עידן אברהם',  'idan@goren.il',   '0501111005', true, 1, '#7C3AED'),
  ('ליאם שפירא',  'liam@goren.il',   '0501111006', true, 1, '#0891B2'),
  ('עמית ביטון',  'amit@goren.il',   '0501111007', true, 1, '#BE185D'),
  ('רון אוחיון',  'ron@goren.il',    '0501111008', true, 1, '#4F46E5'),
  ('שחר גולן',    'shahar@goren.il', '0501111009', true, 1, '#059669'),
  ('אבישי דהן',   'avishai@goren.il','0501111010', true, 1, '#EA580C')
ON CONFLICT DO NOTHING;

-- ============================================
-- משמרות 3 שעות לכל השבוע – שתי עמדות
-- dayId: 1=ראשון ... 7=שבת
-- fromHour/toHour: 0–24
-- ============================================
DO $$
DECLARE
  v_outpost_sg  INT;
  v_outpost_hamal INT;
  d INT;
  h INT;
BEGIN
  SELECT id INTO v_outpost_sg    FROM public.outposts WHERE name = 'ש.ג ראשי' AND "campId" = 1;
  SELECT id INTO v_outpost_hamal FROM public.outposts WHERE name = 'חמ"ל'     AND "campId" = 1;

  FOR d IN 1..7 LOOP          -- ראשון..שבת
    FOR h IN 0..7 LOOP        -- 8 משמרות ביום (0,3,6,...,21)
      -- ש.ג ראשי
      INSERT INTO public.shifts ("outpostId", "dayId", "fromHour", "toHour")
      VALUES (v_outpost_sg, d, h*3, h*3+3)
      ON CONFLICT DO NOTHING;
      -- חמ"ל
      INSERT INTO public.shifts ("outpostId", "dayId", "fromHour", "toHour")
      VALUES (v_outpost_hamal, d, h*3, h*3+3)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
