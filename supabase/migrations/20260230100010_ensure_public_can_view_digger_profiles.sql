-- Ensure any user (authenticated or not) can view digger profiles when they have the profile link
-- Profile links: /digger/:id, /profile/:handle/digger

-- Drop and recreate to ensure policy exists and is correct
DROP POLICY IF EXISTS "Public can view digger profiles by link" ON public.digger_profiles;
DROP POLICY IF EXISTS "Public can view digger marketplace profiles" ON public.digger_profiles;

CREATE POLICY "Anyone can view digger profiles by link"
ON public.digger_profiles
FOR SELECT
USING (true);

COMMENT ON POLICY "Anyone can view digger profiles by link" ON public.digger_profiles IS
'Any user (including unauthenticated) can view digger profiles when they have the link (/digger/:id or /profile/:handle/digger). Contact info reveal remains gated by charge-profile-view.';
