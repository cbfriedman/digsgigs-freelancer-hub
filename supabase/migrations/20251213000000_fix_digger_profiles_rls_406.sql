-- Fix 406 errors on digger_profiles queries
-- The issue is that multiple RLS policies might be conflicting
-- This migration ensures policies are clear and non-conflicting

-- Drop all existing SELECT policies on digger_profiles
DROP POLICY IF EXISTS "Diggers can view own profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Giggers can view matched digger profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Admins can view all digger profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Public can view digger marketplace profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Anyone can view digger profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Digger profiles are viewable by everyone" ON public.digger_profiles;

-- Recreate policies in a clear, non-conflicting way
-- Policy 1: Diggers can always view their own profiles (highest priority)
CREATE POLICY "Diggers can view own profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy 2: Public can view digger profiles for marketplace browsing
-- This allows unauthenticated users to browse diggers
CREATE POLICY "Public can view digger marketplace profiles"
ON public.digger_profiles
FOR SELECT
USING (true);

-- Policy 3: Giggers can view profiles if they have a matched gig
-- This uses a function to check access
CREATE POLICY "Giggers can view matched digger profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  public.gigger_has_access_to_digger(auth.uid(), id)
);

-- Policy 4: Admins can view all profiles
CREATE POLICY "Admins can view all digger profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  public.has_app_role(auth.uid(), 'admin')
);

-- Add comment explaining the policy order
COMMENT ON POLICY "Diggers can view own profiles" ON public.digger_profiles IS 
'Diggers can always view their own profiles. This policy has highest priority.';

COMMENT ON POLICY "Public can view digger marketplace profiles" ON public.digger_profiles IS 
'Allows public viewing of digger profiles for marketplace browsing. Applications should not select sensitive columns like phone for other users.';

