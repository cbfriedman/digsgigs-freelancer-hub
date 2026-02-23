-- Sync profiles.email_verified from auth.users.email_confirmed_at so "About the client" and
-- Gigger/Digger profiles show verification status. Runs on signup (handle_new_user) and when
-- email is confirmed (trigger below). Backfill existing profiles.

-- 1) Extend handle_new_user to set email_verified and social_verified on insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _email_verified boolean := (NEW.email_confirmed_at IS NOT NULL);
  _social_verified boolean := (
    NEW.raw_user_meta_data->>'provider' IS NOT NULL
    AND NEW.raw_user_meta_data->>'provider' != 'email'
  );
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type, avatar_url, email_verified, social_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL,
    NEW.raw_user_meta_data->>'avatar_url',
    _email_verified,
    _social_verified
  );
  RETURN NEW;
END;
$$;

-- 2) When auth.users.email_confirmed_at or raw_user_meta_data changes, sync to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_verification_from_auth_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _email_verified boolean := (NEW.email_confirmed_at IS NOT NULL);
  _social_verified boolean := (
    NEW.raw_user_meta_data->>'provider' IS NOT NULL
    AND NEW.raw_user_meta_data->>'provider' != 'email'
  );
BEGIN
  UPDATE public.profiles
  SET
    email_verified = _email_verified,
    social_verified = _social_verified
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users so that when user confirms email (or metadata changes), profile is updated
DROP TRIGGER IF EXISTS sync_profile_verification_from_auth ON auth.users;
CREATE TRIGGER sync_profile_verification_from_auth
  AFTER UPDATE OF email_confirmed_at, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_verification_from_auth_trigger();

-- 3) Backfill existing profiles from auth.users
UPDATE public.profiles p
SET
  email_verified = COALESCE((SELECT (a.email_confirmed_at IS NOT NULL) FROM auth.users a WHERE a.id = p.id), p.email_verified),
  social_verified = COALESCE((
    SELECT (a.raw_user_meta_data->>'provider' IS NOT NULL AND a.raw_user_meta_data->>'provider' != 'email')
    FROM auth.users a WHERE a.id = p.id
  ), p.social_verified)
WHERE EXISTS (SELECT 1 FROM auth.users a WHERE a.id = p.id);
