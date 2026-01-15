-- Restrict digger_profiles viewing to match application logic
-- Remove public viewing policy - only allow authenticated users with proper access

-- Drop the overly permissive public viewing policy
DROP POLICY IF EXISTS "Public can view digger marketplace profiles" ON public.digger_profiles;

-- The existing policies already handle:
-- 1. Diggers can view own profiles (from previous migration)
-- 2. Giggers can view matched digger profiles (from previous migration)  
-- 3. Admins can view all profiles (from previous migration)

-- Add comment explaining the restricted access
COMMENT ON TABLE public.digger_profiles IS 
'Digger profiles are only viewable by:
1. The profile owner (user_id = auth.uid())
2. Giggers who have posted gigs that were matched/sent to this digger (via lead_purchases or lead_exclusivity_queue)
3. Admins

Public viewing is NOT allowed. This ensures privacy and matches the application-level restrictions.';
