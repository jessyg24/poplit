-- Custom enum types for PopLit
CREATE TYPE user_role AS ENUM ('reader', 'writer', 'admin');
CREATE TYPE story_status AS ENUM ('draft', 'pending_review', 'ai_flagged', 'approved', 'rejected', 'published', 'archived');
CREATE TYPE popcycle_status AS ENUM ('draft', 'scheduled', 'submissions_open', 'reading_open', 'popoff', 'completed');
CREATE TYPE popcycle_format AS ENUM ('standard', 'flash', 'themed', 'sponsored');
CREATE TYPE report_target AS ENUM ('story', 'user', 'comment');
CREATE TYPE report_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');
CREATE TYPE strike_status AS ENUM ('active', 'appealed', 'reversed', 'expired');
CREATE TYPE subscription_tier AS ENUM ('tier_1', 'tier_2');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE notification_type AS ENUM (
  'pop_milestone', 'badge_earned', 'popoff_result', 'new_follower',
  'new_comment', 'new_message', 'story_approved', 'story_rejected',
  'strike_issued', 'wildcard_win', 'anthology_selected'
);
