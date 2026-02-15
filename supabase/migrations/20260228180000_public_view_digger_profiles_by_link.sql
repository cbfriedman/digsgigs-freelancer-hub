-- Allow anyone to view a digger profile when they have the profile link (id or handle).
-- Restores public read access so unauthenticated and any user can load the profile page.

CREATE POLICY "Public can view digger profiles by link"
ON public.digger_profiles
FOR SELECT
TO public
USING (true);

COMMENT ON POLICY "Public can view digger profiles by link" ON public.digger_profiles IS
'Anyone can view digger profiles (e.g. via /digger/:handle or /digger/:id). Contact/phone reveal remains gated by charge-profile-view.';

-- Allow reading the linked profile row (full_name, avatar_url) when loading a digger profile.
-- Applications should not display email/phone for other users without explicit unlock.
CREATE POLICY "Public can view digger user profile when viewing digger"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.user_id = profiles.id)
);

COMMENT ON POLICY "Public can view digger user profile when viewing digger" ON public.profiles IS
'Allows loading profile (e.g. full_name, avatar_url) for diggers when viewing their profile page. Do not display email/phone without charge-profile-view.';
