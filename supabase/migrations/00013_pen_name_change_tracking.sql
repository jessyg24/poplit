-- Track when pen_name was last changed
ALTER TABLE users ADD COLUMN pen_name_changed_at TIMESTAMPTZ;
