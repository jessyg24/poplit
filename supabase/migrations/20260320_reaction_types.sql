-- Expand reaction_type from 'up' only to like/love/laugh/cry
-- The column is TEXT with a CHECK constraint, so update the constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check
  CHECK (reaction_type IN ('up', 'like', 'love', 'laugh', 'cry'));

-- Migrate existing 'up' reactions to 'like'
UPDATE reactions SET reaction_type = 'like' WHERE reaction_type = 'up';
