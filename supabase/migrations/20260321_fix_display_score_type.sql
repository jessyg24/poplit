-- display_score should be NUMERIC like raw_score, not INTEGER
ALTER TABLE scores ALTER COLUMN display_score TYPE NUMERIC USING display_score::NUMERIC;
