-- All users are both readers and writers. Collapse reader/writer into "user".
-- Strategy: convert column to text, drop old enum, create new enum with 'user', convert back.

-- 0. Drop RLS policies that depend on users.role column type
DROP POLICY IF EXISTS "Admins can read platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can update platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Admins can insert platform_settings" ON platform_settings;

-- 1. Drop dependent default
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- 2. Convert column to text (breaks dependency on the enum)
ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- 3. Migrate existing rows while column is text
UPDATE users SET role = 'user' WHERE role IN ('reader', 'writer');

-- 4. Drop old enum and create new one with 'user' and 'admin'
DROP TYPE IF EXISTS user_role;
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- 5. Convert column back to enum
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;

-- 6. Set new default
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- 7. Recreate the RLS policies that were dropped
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

-- 8. Update the auth signup trigger to default new users to 'user'
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
    'user'::public.user_role,
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
        INSERT INTO invite_redemptions (inviter_id, invitee_id, credits_awarded)
        VALUES (inviter_id, NEW.id, true);

        UPDATE public.users SET entry_credits = entry_credits + 1
        WHERE id = inviter_id;

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
