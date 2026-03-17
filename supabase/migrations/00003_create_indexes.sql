-- Performance indexes

-- Users
CREATE INDEX idx_users_pen_name ON users(pen_name);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Stories
CREATE INDEX idx_stories_author_id ON stories(author_id);
CREATE INDEX idx_stories_popcycle_id ON stories(popcycle_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_genre ON stories(genre);
CREATE INDEX idx_stories_published_at ON stories(published_at) WHERE published_at IS NOT NULL;

-- Pops
CREATE INDEX idx_pops_reader_id ON pops(reader_id);
CREATE INDEX idx_pops_story_id ON pops(story_id);
CREATE INDEX idx_pops_created_at ON pops(created_at);

-- Scores
CREATE INDEX idx_scores_popcycle_id ON scores(popcycle_id);
CREATE INDEX idx_scores_display_score ON scores(display_score DESC);
CREATE INDEX idx_scores_rank ON scores(rank) WHERE rank IS NOT NULL;

-- Popcycles
CREATE INDEX idx_popcycles_status ON popcycles(status);
CREATE INDEX idx_popcycles_popoff_at ON popcycles(popoff_at);

-- Comments
CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Follows
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- Reports
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);

-- Strikes
CREATE INDEX idx_strikes_user_id ON strikes(user_id);
CREATE INDEX idx_strikes_status ON strikes(status);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- User badges
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- Feature pokes
CREATE INDEX idx_feature_pokes_feature_id ON feature_pokes(feature_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
