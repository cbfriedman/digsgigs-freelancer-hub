-- Allow reading the linked profile row when loading a Gigger profile page (/gigger/:userId).
-- Same idea as "Public can view digger user profile when viewing digger" but for Giggers.
-- Without this, RLS blocks profiles for users who have gigger_profiles but no digger_profiles.

DROP POLICY IF EXISTS "Public can view gigger user profile when viewing gigger" ON public.profiles;

CREATE POLICY "Public can view gigger user profile when viewing gigger"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (SELECT 1 FROM public.gigger_profiles gp WHERE gp.user_id = profiles.id)
);

COMMENT ON POLICY "Public can view gigger user profile when viewing gigger" ON public.profiles IS
'Allows loading profile (e.g. full_name, avatar_url) for Giggers when viewing their Gigger profile page.';
