-- Update entry fee default to $3.00
ALTER TABLE popcycles ALTER COLUMN entry_fee_cents SET DEFAULT 300;

-- Replace prize distribution columns
ALTER TABLE popcycles RENAME COLUMN winner_pct TO first_pct;
ALTER TABLE popcycles RENAME COLUMN runner_up_pct TO second_pct;
ALTER TABLE popcycles RENAME COLUMN wildcard_pct TO third_pct;
ALTER TABLE popcycles ADD COLUMN house_pct INTEGER NOT NULL DEFAULT 15;

-- Set new defaults
ALTER TABLE popcycles ALTER COLUMN first_pct SET DEFAULT 65;
ALTER TABLE popcycles ALTER COLUMN second_pct SET DEFAULT 12;
ALTER TABLE popcycles ALTER COLUMN third_pct SET DEFAULT 5;

-- Update existing rows to new distribution
UPDATE popcycles SET first_pct = 65, second_pct = 12, third_pct = 5, house_pct = 15;

-- Update subscription tier enum: tier_1/tier_2 -> monthly/annual
ALTER TYPE subscription_tier RENAME VALUE 'tier_1' TO 'monthly';
ALTER TYPE subscription_tier RENAME VALUE 'tier_2' TO 'annual';

-- Add entry_credits column to subscriptions for credit tracking
ALTER TABLE subscriptions ADD COLUMN entry_credits INTEGER NOT NULL DEFAULT 0;

-- Add entry_credits to users for tracking available credits
ALTER TABLE users ADD COLUMN entry_credits INTEGER NOT NULL DEFAULT 0;
