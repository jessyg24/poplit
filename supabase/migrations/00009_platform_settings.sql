-- Platform settings (single-row, JSONB)
CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the default row
INSERT INTO platform_settings (id, settings) VALUES ('default', '{
  "popsPerMinute": 10,
  "commentsPerMinute": 5,
  "messagesPerMinute": 10,
  "submissionsPerPopcycle": 1,
  "minReadTimeMs": 15000,
  "aiDetectionThreshold": 0.85,
  "accountAgeWeight": 0.25,
  "completionRateWeight": 0.30,
  "activityLevelWeight": 0.20,
  "badgeCountWeight": 0.10,
  "contestHistoryWeight": 0.15,
  "multiplierFloor": 0.90,
  "multiplierCeiling": 1.10,
  "section1Weight": 1.0,
  "section2Weight": 1.2,
  "section3Weight": 1.4,
  "section4Weight": 1.6,
  "section5Weight": 2.0
}'::jsonb);

-- RLS: only admins can read/write
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform_settings"
  ON platform_settings FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update platform_settings"
  ON platform_settings FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can insert platform_settings"
  ON platform_settings FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
