-- Add published_works JSONB column to users table
-- Stores array of { title, url, store } objects
-- e.g. [{ "title": "My Novel", "url": "https://amazon.com/...", "store": "Amazon" }]
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS published_works jsonb DEFAULT '[]'::jsonb;
