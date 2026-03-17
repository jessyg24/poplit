-- Seed badge definitions
INSERT INTO badges (name, description, icon, criteria) VALUES
  ('First Pop', 'Read your first story section', 'sparkles', '{"type": "pop_count", "threshold": 1}'),
  ('Bookworm', 'Complete reading 10 stories', 'book-open', '{"type": "completion_count", "threshold": 10}'),
  ('Devoted Reader', 'Complete reading 50 stories', 'library', '{"type": "completion_count", "threshold": 50}'),
  ('First Entry', 'Submit your first story', 'pencil', '{"type": "submission_count", "threshold": 1}'),
  ('Serial Writer', 'Submit 5 stories', 'pen-tool', '{"type": "submission_count", "threshold": 5}'),
  ('Podium Finish', 'Finish top 3 in a Popcycle', 'trophy', '{"type": "rank", "threshold": 3}'),
  ('Champion', 'Win a Popcycle', 'crown', '{"type": "rank", "threshold": 1}'),
  ('Wildcard', 'Win a wildcard slot', 'zap', '{"type": "wildcard_win", "threshold": 1}'),
  ('Social Butterfly', 'Gain 50 followers', 'users', '{"type": "follower_count", "threshold": 50}'),
  ('Anthology Pick', 'Selected for quarterly anthology', 'star', '{"type": "anthology_selection", "threshold": 1}')
ON CONFLICT (name) DO NOTHING;
