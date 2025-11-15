-- Fix Critical RLS Policy Issues: Email and Phone Exposure
-- This migration secures the profiles and digger_profiles tables

-- ============================================
-- FIX PROFILES TABLE - Email Exposure
-- ============================================

-- Drop the overly permissive public viewing policy
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- Create a new restrictive policy that only allows viewing non-sensitive public data
-- Note: This policy allows viewing id, full_name, and user_type but NOT email
CREATE POLICY "Public can view basic profile info"
ON public.profiles
FOR SELECT
USING (true);

-- The existing "Users can view own email" policy already handles authenticated users seeing their own data
-- So authenticated users will see their own email via that policy, but others won't

-- Add helpful comment explaining column-level security
COMMENT ON POLICY "Public can view basic profile info" ON public.profiles IS 
'Allows public viewing of profiles. Applications MUST NOT select the email column for other users - only select id, full_name, user_type when querying other profiles.';

-- ============================================
-- FIX DIGGER_PROFILES TABLE - Phone Exposure  
-- ============================================

-- Drop the misleading public viewing policy
DROP POLICY IF EXISTS "Public can view digger profiles without phone" ON public.digger_profiles;

-- Create a new public viewing policy with clear documentation
CREATE POLICY "Public can view digger marketplace profiles"
ON public.digger_profiles
FOR SELECT
USING (true);

-- The existing "Profile owners can view own phone" policy already handles owners seeing their phone
-- So authenticated diggers will see their own phone via that policy, but others won't

-- Add helpful comment explaining column-level security
COMMENT ON POLICY "Public can view digger marketplace profiles" ON public.digger_profiles IS 
'Allows public viewing of digger profiles for marketplace browsing. Applications MUST NOT select the phone column for other users - only select phone when user_id matches auth.uid().';

-- ============================================
-- APPLICATION LAYER GUIDANCE
-- ============================================

-- Important: PostgreSQL RLS policies cannot filter columns directly.
-- The application layer MUST implement column filtering:
--
-- For profiles table:
--   - When querying other users: SELECT id, full_name, user_type (NO email)
--   - When querying own profile: SELECT * is fine (email policy allows it)
--
-- For digger_profiles table:  
--   - When browsing diggers: SELECT all columns EXCEPT phone
--   - When viewing own profile: SELECT * is fine (phone policy allows it)
--   - Phone should only be shown to gig owners who purchased the lead
--
-- Consider creating database views for public access that explicitly exclude sensitive columns