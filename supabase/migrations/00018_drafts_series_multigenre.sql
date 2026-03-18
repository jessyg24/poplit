-- Migration 00018: Story drafts, series (predecessor linking), multi-genre
-- Allows writers to save standalone drafts before attaching to a Popcycle.

BEGIN;

-- 1. Add content column for raw draft text
ALTER TABLE stories ADD COLUMN content TEXT;

-- 2. Make popcycle_id nullable (drafts don't belong to a Popcycle yet)
ALTER TABLE stories ALTER COLUMN popcycle_id DROP NOT NULL;

-- 3. Make sections nullable (drafts only have content, not sections)
ALTER TABLE stories ALTER COLUMN section_1 DROP NOT NULL;
ALTER TABLE stories ALTER COLUMN section_2 DROP NOT NULL;
ALTER TABLE stories ALTER COLUMN section_3 DROP NOT NULL;
ALTER TABLE stories ALTER COLUMN section_4 DROP NOT NULL;
ALTER TABLE stories ALTER COLUMN section_5 DROP NOT NULL;

-- 4. Make hook nullable (drafts in progress may not have a hook yet)
ALTER TABLE stories ALTER COLUMN hook DROP NOT NULL;

-- 5. Multi-genre: convert genre from TEXT to TEXT[]
ALTER TABLE stories ALTER COLUMN genre TYPE TEXT[] USING ARRAY[genre];

-- 6. Add predecessor_id for series/sequel linking
ALTER TABLE stories ADD COLUMN predecessor_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- 7. Replace unique constraint: drop old UNIQUE(author_id, popcycle_id),
--    add partial unique index that allows multiple drafts (null popcycle_id)
--    while enforcing one active submission per author per Popcycle.
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stories_author_id_popcycle_id_key'
    AND conrelid = 'stories'::regclass
  ) THEN
    ALTER TABLE stories DROP CONSTRAINT stories_author_id_popcycle_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX idx_stories_author_popcycle_active
  ON stories (author_id, popcycle_id)
  WHERE popcycle_id IS NOT NULL AND status NOT IN ('draft', 'rejected');

-- 8. New notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'series_sequel_available';

-- 9. New indexes
CREATE INDEX idx_stories_genre_gin ON stories USING GIN (genre);
CREATE INDEX idx_stories_predecessor ON stories(predecessor_id) WHERE predecessor_id IS NOT NULL;

-- 10. RLS: allow draft deletion (own drafts with no popcycle_id)
CREATE POLICY "Stories: delete own draft" ON stories
  FOR DELETE USING (author_id = auth.uid() AND status = 'draft' AND popcycle_id IS NULL);

COMMIT;
