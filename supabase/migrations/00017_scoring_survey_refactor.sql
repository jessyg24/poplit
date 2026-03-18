-- ============================================================
-- 00017: Scoring System Refactor + Surveys + Pop-py Gardens
--
-- Removes: past_winner_boost, time_quality_factor, completion_bonus
-- Adds: reader_stats table, survey_responses, exit_surveys,
--        poppy_gardens, re_read_count, garden columns on scores,
--        reactions constraint change (up-only)
-- ============================================================

-- 1. reader_stats table (fixes missing table — edge functions reference it)
CREATE TABLE IF NOT EXISTS public.reader_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reader_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY reader_stats_own_select ON public.reader_stats
  FOR SELECT USING (auth.uid() = user_id);

-- 2. survey_responses table (ending survey)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  q1_answer TEXT NOT NULL CHECK (q1_answer IN ('A', 'B', 'C', 'D')),
  q2_answer TEXT NOT NULL CHECK (q2_answer IN ('A', 'B', 'C', 'D')),
  decay_applied NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reader_id, story_id)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY survey_responses_insert ON public.survey_responses
  FOR INSERT WITH CHECK (auth.uid() = reader_id);

CREATE POLICY survey_responses_own_select ON public.survey_responses
  FOR SELECT USING (auth.uid() = reader_id);

-- 3. exit_surveys table (abandon survey)
CREATE TABLE IF NOT EXISTS public.exit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  section_stopped_at INTEGER NOT NULL CHECK (section_stopped_at BETWEEN 1 AND 4),
  reason TEXT NOT NULL CHECK (reason IN ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reader_id, story_id)
);

ALTER TABLE public.exit_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY exit_surveys_insert ON public.exit_surveys
  FOR INSERT WITH CHECK (auth.uid() = reader_id);

CREATE POLICY exit_surveys_reader_select ON public.exit_surveys
  FOR SELECT USING (auth.uid() = reader_id);

CREATE POLICY exit_surveys_writer_select ON public.exit_surveys
  FOR SELECT USING (
    story_id IN (SELECT id FROM public.stories WHERE author_id = auth.uid())
  );

-- 4. poppy_gardens table
CREATE TABLE IF NOT EXISTS public.poppy_gardens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reader_id, story_id)
);

ALTER TABLE public.poppy_gardens ENABLE ROW LEVEL SECURITY;

CREATE POLICY poppy_gardens_reader_insert ON public.poppy_gardens
  FOR INSERT WITH CHECK (auth.uid() = reader_id);

CREATE POLICY poppy_gardens_reader_delete ON public.poppy_gardens
  FOR DELETE USING (auth.uid() = reader_id);

CREATE POLICY poppy_gardens_select ON public.poppy_gardens
  FOR SELECT USING (true);

-- 5. Add columns to scores
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS re_read_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS garden_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS garden_boost NUMERIC NOT NULL DEFAULT 1.0;

-- 6. Change reactions constraint: remove 'down', keep 'up' only
-- Drop old constraint and add new one
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;
ALTER TABLE public.reactions ADD CONSTRAINT reactions_reaction_type_check CHECK (reaction_type = 'up');

-- Clean up any existing 'down' reactions
DELETE FROM public.reactions WHERE reaction_type = 'down';

-- Add convergence_multiplier column to reactions
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS convergence_multiplier NUMERIC NOT NULL DEFAULT 1.0;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_story ON public.survey_responses(story_id);
CREATE INDEX IF NOT EXISTS idx_exit_surveys_story ON public.exit_surveys(story_id);
CREATE INDEX IF NOT EXISTS idx_poppy_gardens_story ON public.poppy_gardens(story_id);
CREATE INDEX IF NOT EXISTS idx_poppy_gardens_reader ON public.poppy_gardens(reader_id);
