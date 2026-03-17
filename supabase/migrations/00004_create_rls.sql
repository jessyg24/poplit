-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE popcycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthology_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_bubbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_pokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==================
-- USERS
-- ==================
CREATE POLICY "Users: public read" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users: own update" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users: admin update" ON users
  FOR UPDATE USING (is_admin());

CREATE POLICY "Users: insert own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================
-- STORIES
-- ==================
CREATE POLICY "Stories: read published" ON stories
  FOR SELECT USING (status = 'published' OR author_id = auth.uid() OR is_admin());

CREATE POLICY "Stories: insert own" ON stories
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Stories: update own draft" ON stories
  FOR UPDATE USING (author_id = auth.uid() AND status IN ('draft', 'pending_review'));

CREATE POLICY "Stories: admin update" ON stories
  FOR UPDATE USING (is_admin());

-- ==================
-- POPCYCLES
-- ==================
CREATE POLICY "Popcycles: public read" ON popcycles
  FOR SELECT USING (true);

CREATE POLICY "Popcycles: admin manage" ON popcycles
  FOR ALL USING (is_admin());

-- ==================
-- POPS
-- ==================
CREATE POLICY "Pops: insert own" ON pops
  FOR INSERT WITH CHECK (reader_id = auth.uid());

CREATE POLICY "Pops: read own" ON pops
  FOR SELECT USING (reader_id = auth.uid());

CREATE POLICY "Pops: admin read" ON pops
  FOR SELECT USING (is_admin());

-- ==================
-- SCORES
-- ==================
-- display_score is public, raw_score only for admin
CREATE POLICY "Scores: public read display" ON scores
  FOR SELECT USING (true);

-- Note: raw_score and weighted_value should be filtered in queries, not RLS
-- Admin gets full access
CREATE POLICY "Scores: admin manage" ON scores
  FOR ALL USING (is_admin());

-- ==================
-- BADGES
-- ==================
CREATE POLICY "Badges: public read" ON badges
  FOR SELECT USING (true);

CREATE POLICY "Badges: admin manage" ON badges
  FOR ALL USING (is_admin());

-- ==================
-- USER BADGES
-- ==================
CREATE POLICY "User badges: public read" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "User badges: admin insert" ON user_badges
  FOR INSERT WITH CHECK (is_admin());

-- ==================
-- FOLLOWS
-- ==================
CREATE POLICY "Follows: public read" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Follows: insert own" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Follows: delete own" ON follows
  FOR DELETE USING (follower_id = auth.uid());

-- ==================
-- COMMENTS
-- ==================
CREATE POLICY "Comments: public read" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Comments: insert authenticated" ON comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Comments: update own" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Comments: delete own or admin" ON comments
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ==================
-- MESSAGES
-- ==================
CREATE POLICY "Messages: read own" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Messages: insert own" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Messages: update read status" ON messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- ==================
-- REPORTS
-- ==================
CREATE POLICY "Reports: insert authenticated" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reports: admin read" ON reports
  FOR SELECT USING (is_admin());

CREATE POLICY "Reports: admin update" ON reports
  FOR UPDATE USING (is_admin());

-- ==================
-- STRIKES
-- ==================
CREATE POLICY "Strikes: read own" ON strikes
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Strikes: admin manage" ON strikes
  FOR ALL USING (is_admin());

-- ==================
-- ANTHOLOGY ENTRIES
-- ==================
CREATE POLICY "Anthology: public read" ON anthology_entries
  FOR SELECT USING (true);

CREATE POLICY "Anthology: admin manage" ON anthology_entries
  FOR ALL USING (is_admin());

-- ==================
-- FEATURE BUBBLES
-- ==================
CREATE POLICY "Features: public read" ON feature_bubbles
  FOR SELECT USING (true);

CREATE POLICY "Features: authenticated insert" ON feature_bubbles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Features: admin manage" ON feature_bubbles
  FOR ALL USING (is_admin());

-- ==================
-- FEATURE POKES
-- ==================
CREATE POLICY "Pokes: public read" ON feature_pokes
  FOR SELECT USING (true);

CREATE POLICY "Pokes: insert own" ON feature_pokes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Pokes: delete own" ON feature_pokes
  FOR DELETE USING (user_id = auth.uid());

-- ==================
-- SUBSCRIPTIONS
-- ==================
CREATE POLICY "Subscriptions: read own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Subscriptions: admin manage" ON subscriptions
  FOR ALL USING (is_admin());

-- ==================
-- NOTIFICATIONS
-- ==================
CREATE POLICY "Notifications: read own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Notifications: update own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Notifications: admin insert" ON notifications
  FOR INSERT WITH CHECK (is_admin());
