-- Add is_suspended to profiles for admin user management UI
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.is_suspended IS 'True when user has been suspended/banned by admin. Synced from auth.users banned_until.';

-- Allow admins to update profiles (for is_suspended sync from Edge Function and manual overrides)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
