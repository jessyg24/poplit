-- AI Transparency: self-disclosure + auto-flag disclaimer fields
-- ai_assisted: writer self-tag at submission time
-- ai_disclaimer: public badge — ONLY toggled by admin (final say)
-- ai_disclaimer_source: tracks origin (self_disclosed / auto_flagged) for admin context
ALTER TABLE stories
  ADD COLUMN ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN ai_disclaimer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN ai_disclaimer_source TEXT CHECK (ai_disclaimer_source IN ('self_disclosed', 'auto_flagged'));
