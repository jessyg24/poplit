-- Change single prompt to 5 related prompts per popcycle
-- Rename existing prompt column to prompt_1, add prompt_2 through prompt_5
ALTER TABLE popcycles RENAME COLUMN prompt TO prompt_1;
ALTER TABLE popcycles ADD COLUMN prompt_2 TEXT NOT NULL DEFAULT '';
ALTER TABLE popcycles ADD COLUMN prompt_3 TEXT NOT NULL DEFAULT '';
ALTER TABLE popcycles ADD COLUMN prompt_4 TEXT NOT NULL DEFAULT '';
ALTER TABLE popcycles ADD COLUMN prompt_5 TEXT NOT NULL DEFAULT '';

-- Also add a prompt_theme column for the overarching theme connecting all 5
ALTER TABLE popcycles ADD COLUMN prompt_theme TEXT NOT NULL DEFAULT '';
