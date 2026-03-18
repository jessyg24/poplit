-- Inline text reactions
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES users(id),
  story_id UUID NOT NULL REFERENCES stories(id),
  section INT NOT NULL CHECK (section BETWEEN 1 AND 5),
  start_offset INT NOT NULL,
  end_offset INT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('up', 'down')),
  text_snippet TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reactions_story ON reactions(story_id);
CREATE INDEX idx_reactions_reader_story ON reactions(reader_id, story_id);

-- Rankings table (stores final Popoff results per popcycle)
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popcycle_id UUID NOT NULL REFERENCES popcycles(id),
  story_id UUID NOT NULL REFERENCES stories(id),
  author_id UUID NOT NULL REFERENCES users(id),
  rank INT NOT NULL,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  raw_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rankings_popcycle ON rankings(popcycle_id);
CREATE INDEX idx_rankings_author ON rankings(author_id);

-- Add reaction_score to scores
ALTER TABLE scores ADD COLUMN reaction_score NUMERIC NOT NULL DEFAULT 0;

-- Enable realtime on reactions
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- RLS for reactions
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all reactions"
  ON reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = reader_id);

-- RLS for rankings (read-only for all)
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rankings"
  ON rankings FOR SELECT USING (true);
