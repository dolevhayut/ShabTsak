-- ============================================
-- Users table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  picture TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon read' AND tablename = 'users') THEN
    CREATE POLICY "Allow anon read" ON public.users FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon insert' AND tablename = 'users') THEN
    CREATE POLICY "Allow anon insert" ON public.users FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.users (id, phone, name, role)
VALUES ('000000000', '0500000000', 'מפקד כיתת כוננות גורן', 'commander')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Camps
-- ============================================
CREATE TABLE IF NOT EXISTS public.camps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'camps_anon_all' AND tablename = 'camps') THEN
    CREATE POLICY "camps_anon_all" ON public.camps FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Outposts
-- ============================================
CREATE TABLE IF NOT EXISTS public.outposts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  "minGuards" INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.outposts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outposts_anon_all' AND tablename = 'outposts') THEN
    CREATE POLICY "outposts_anon_all" ON public.outposts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Guards
-- ============================================
CREATE TABLE IF NOT EXISTS public.guards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mail TEXT,
  phone TEXT,
  color TEXT DEFAULT '#2563EB',
  "shouldBeAllocated" BOOLEAN DEFAULT true,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guards ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2563EB';

ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guards_anon_all' AND tablename = 'guards') THEN
    CREATE POLICY "guards_anon_all" ON public.guards FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

UPDATE public.guards
SET color = (ARRAY['#2563EB', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#BE185D', '#4F46E5'])[((id % 8) + 1)]
WHERE color IS NULL OR color = '';

-- ============================================
-- Shifts
-- ============================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id SERIAL PRIMARY KEY,
  "outpostId" INT NOT NULL REFERENCES public.outposts(id) ON DELETE CASCADE,
  "dayId" INT NOT NULL CHECK ("dayId" BETWEEN 1 AND 7),
  "fromHour" INT NOT NULL CHECK ("fromHour" BETWEEN 0 AND 24),
  "toHour" INT NOT NULL CHECK ("toHour" BETWEEN 0 AND 24),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_anon_all' AND tablename = 'shifts') THEN
    CREATE POLICY "shifts_anon_all" ON public.shifts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Shibuts (assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shibuts (
  id SERIAL PRIMARY KEY,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "shiftId" INT NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  "outpostId" INT NOT NULL REFERENCES public.outposts(id) ON DELETE CASCADE,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  "theDate" BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shibuts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shibuts_anon_all' AND tablename = 'shibuts') THEN
    CREATE POLICY "shibuts_anon_all" ON public.shibuts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Guard Time Limits
-- ============================================
CREATE TABLE IF NOT EXISTS public.guard_time_limits (
  id SERIAL PRIMARY KEY,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "dayId" INT NOT NULL CHECK ("dayId" BETWEEN 1 AND 7),
  "fromHour" INT NOT NULL CHECK ("fromHour" BETWEEN 0 AND 24),
  "toHour" INT NOT NULL CHECK ("toHour" BETWEEN 0 AND 24),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guard_time_limits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guard_time_limits_anon_all' AND tablename = 'guard_time_limits') THEN
    CREATE POLICY "guard_time_limits_anon_all" ON public.guard_time_limits FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Guard Outpost Limits
-- ============================================
CREATE TABLE IF NOT EXISTS public.guard_outpost_limits (
  id SERIAL PRIMARY KEY,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "outpostId" INT NOT NULL REFERENCES public.outposts(id) ON DELETE CASCADE,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guard_outpost_limits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guard_outpost_limits_anon_all' AND tablename = 'guard_outpost_limits') THEN
    CREATE POLICY "guard_outpost_limits_anon_all" ON public.guard_outpost_limits FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Seed: Moshav Goren + Main Gate Outpost
-- ============================================
INSERT INTO public.camps (name) VALUES ('מושב גורן') ON CONFLICT DO NOTHING;
INSERT INTO public.outposts (name, "campId", "minGuards")
  SELECT 'שער כניסה ראשי ליישוב', id, 1 FROM public.camps WHERE name = 'מושב גורן'
  ON CONFLICT DO NOTHING;

INSERT INTO public.guards (name, mail, phone, "shouldBeAllocated", "campId")
  SELECT 'מפקד כיתת כוננות גורן', 'commander@example.com', '0500000000', true, id
  FROM public.camps
  WHERE name = 'מושב גורן'
  AND NOT EXISTS (
    SELECT 1 FROM public.guards g WHERE g.name = 'מפקד כיתת כוננות גורן' AND g."campId" = public.camps.id
  );

-- ============================================
-- User <-> Guard links
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_guard_links (
  id SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "guardId" INT NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("userId", "campId")
);

ALTER TABLE public.user_guard_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_guard_links_anon_all' AND tablename = 'user_guard_links') THEN
    CREATE POLICY "user_guard_links_anon_all" ON public.user_guard_links FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.user_guard_links ("userId", "guardId", "campId")
SELECT '000000000', g.id, g."campId"
FROM public.guards g
JOIN public.camps c ON c.id = g."campId"
WHERE g.name = 'מפקד כיתת כוננות גורן'
  AND c.name = 'מושב גורן'
ON CONFLICT ("userId", "campId") DO NOTHING;

-- ============================================
-- Shift requests (constraints / swaps)
-- ============================================
CREATE TABLE IF NOT EXISTS public.shift_requests (
  id SERIAL PRIMARY KEY,
  "campId" INT NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  "requesterUserId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "requesterGuardId" INT REFERENCES public.guards(id) ON DELETE SET NULL,
  "targetShibutsId" INT REFERENCES public.shibuts(id) ON DELETE SET NULL,
  "requestType" TEXT NOT NULL CHECK ("requestType" IN ('constraint', 'swap')),
  reason TEXT NOT NULL,
  "requestedPayload" JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  "reviewedBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_requests_camp_status ON public.shift_requests ("campId", status);
CREATE INDEX IF NOT EXISTS idx_shift_requests_requester ON public.shift_requests ("requesterUserId");

ALTER TABLE public.shift_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shift_requests_anon_all' AND tablename = 'shift_requests') THEN
    CREATE POLICY "shift_requests_anon_all" ON public.shift_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Commander actions log
-- ============================================
CREATE TABLE IF NOT EXISTS public.commander_actions_log (
  id SERIAL PRIMARY KEY,
  "commanderUserId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "campId" INT REFERENCES public.camps(id) ON DELETE SET NULL,
  "actionType" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commander_actions_log_commander ON public.commander_actions_log ("commanderUserId");
CREATE INDEX IF NOT EXISTS idx_commander_actions_log_camp ON public.commander_actions_log ("campId");

ALTER TABLE public.commander_actions_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commander_actions_log_anon_all' AND tablename = 'commander_actions_log') THEN
    CREATE POLICY "commander_actions_log_anon_all" ON public.commander_actions_log FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- AI commander intents (future integration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_commander_intents (
  id SERIAL PRIMARY KEY,
  "commanderUserId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "inputText" TEXT NOT NULL,
  "normalizedAction" JSONB,
  "executionStatus" TEXT DEFAULT 'queued' CHECK ("executionStatus" IN ('queued', 'running', 'completed', 'failed')),
  "executionResult" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_commander_intents_commander ON public.ai_commander_intents ("commanderUserId");
CREATE INDEX IF NOT EXISTS idx_ai_commander_intents_status ON public.ai_commander_intents ("executionStatus");

ALTER TABLE public.ai_commander_intents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_commander_intents_anon_all' AND tablename = 'ai_commander_intents') THEN
    CREATE POLICY "ai_commander_intents_anon_all" ON public.ai_commander_intents FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
