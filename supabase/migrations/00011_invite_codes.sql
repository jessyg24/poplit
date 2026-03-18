-- Add invite code to users
ALTER TABLE users ADD COLUMN invite_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id);

-- Generate unique 6-char alphanumeric codes for existing users
UPDATE users SET invite_code = UPPER(SUBSTR(MD5(id::text || NOW()::text), 1, 6))
WHERE invite_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE users ALTER COLUMN invite_code SET NOT NULL;

-- Index for fast lookup during signup
CREATE UNIQUE INDEX idx_users_invite_code ON users(invite_code);

-- Track invite redemptions
CREATE TABLE invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invitee_id)
);

ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invite redemptions: read own" ON invite_redemptions
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Invite redemptions: admin read" ON invite_redemptions
  FOR SELECT USING (is_admin());

-- Update the signup trigger to generate invite codes for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  -- Generate unique 6-char code
  LOOP
    code := UPPER(SUBSTR(MD5(NEW.id::text || NOW()::text || attempts::text || RANDOM()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE invite_code = code);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      code := UPPER(SUBSTR(MD5(NEW.id::text || RANDOM()::text), 1, 8));
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.users (id, email, pen_name, role, invite_code, invited_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'pen_name', 'user_' || LEFT(NEW.id::text, 8)),
    'reader'::public.user_role,
    code,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'invited_by' IS NOT NULL
      THEN (SELECT id FROM public.users WHERE invite_code = UPPER(NEW.raw_user_meta_data ->> 'invited_by') LIMIT 1)
      ELSE NULL
    END
  );

  -- Award credits if invited by someone
  IF NEW.raw_user_meta_data ->> 'invited_by' IS NOT NULL THEN
    DECLARE
      inviter_id UUID;
    BEGIN
      SELECT id INTO inviter_id FROM public.users
      WHERE invite_code = UPPER(NEW.raw_user_meta_data ->> 'invited_by');

      IF inviter_id IS NOT NULL THEN
        -- Record the redemption
        INSERT INTO invite_redemptions (inviter_id, invitee_id, credits_awarded)
        VALUES (inviter_id, NEW.id, true);

        -- Award 1 credit to inviter
        UPDATE public.users SET entry_credits = entry_credits + 1
        WHERE id = inviter_id;

        -- Award 1 credit to invitee
        UPDATE public.users SET entry_credits = entry_credits + 1
        WHERE id = NEW.id;
      END IF;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
