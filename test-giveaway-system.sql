-- Test Script for Giveaway System
-- Run this after applying the migrations to verify everything works

-- ============================================
-- 1. Test Statistics Function
-- ============================================
SELECT 
  'Testing get_giveaway_stats()' as test_name,
  public.get_giveaway_stats() as result;

-- ============================================
-- 2. Test Manual Eligibility Check (replace with actual digger_profile_id)
-- ============================================
-- Uncomment and replace 'YOUR_DIGGER_PROFILE_ID' with an actual ID
/*
SELECT 
  'Testing manual_check_giveaway_eligibility()' as test_name,
  public.manual_check_giveaway_eligibility('YOUR_DIGGER_PROFILE_ID'::UUID) as result;
*/

-- ============================================
-- 3. Check Current Eligible Count
-- ============================================
SELECT 
  'Current Eligible Diggers' as test_name,
  COUNT(*) as eligible_count
FROM public.digger_profiles
WHERE is_giveaway_eligible = true;

-- ============================================
-- 4. Check Recent Qualifications
-- ============================================
SELECT 
  'Recent Qualifications (Last 7 Days)' as test_name,
  COUNT(*) as recent_count,
  MIN(giveaway_qualified_at) as earliest,
  MAX(giveaway_qualified_at) as latest
FROM public.digger_profiles
WHERE is_giveaway_eligible = true
  AND giveaway_qualified_at >= NOW() - INTERVAL '7 days';

-- ============================================
-- 5. Sample Eligible Digger Details
-- ============================================
SELECT 
  dp.id,
  dp.business_name,
  dp.giveaway_qualified_at,
  p.email,
  p.full_name
FROM public.digger_profiles dp
LEFT JOIN public.profiles p ON dp.user_id = p.id
WHERE dp.is_giveaway_eligible = true
ORDER BY dp.giveaway_qualified_at DESC
LIMIT 10;

-- ============================================
-- 6. Check for Profiles Missing Requirements
-- ============================================
SELECT 
  'Profiles Missing Requirements' as test_name,
  COUNT(*) as total_diggers,
  COUNT(*) FILTER (WHERE business_name IS NULL OR business_name = '') as missing_business_name,
  COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as missing_phone,
  COUNT(*) FILTER (WHERE location IS NULL OR location = '') as missing_location,
  COUNT(*) FILTER (WHERE bio IS NULL OR bio = '') as missing_bio,
  COUNT(*) FILTER (WHERE profile_image_url IS NULL OR profile_image_url = '') as missing_photo,
  COUNT(*) FILTER (WHERE verified IS NOT TRUE) as not_verified
FROM public.digger_profiles;

-- ============================================
-- 7. Check Profession Assignments
-- ============================================
SELECT 
  'Profiles with Profession Assignments' as test_name,
  COUNT(DISTINCT dp.id) as diggers_with_professions,
  COUNT(DISTINCT dp.id) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM public.digger_profession_assignments dpa 
    WHERE dpa.digger_profile_id = dp.id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.digger_categories dc 
    WHERE dc.digger_id = dp.id
  )) as diggers_without_professions
FROM public.digger_profiles dp;

-- ============================================
-- 8. Verify Triggers Are Working
-- ============================================
-- Check if triggers exist
SELECT 
  'Trigger Verification' as test_name,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%giveaway%'
ORDER BY trigger_name;

-- ============================================
-- 9. Test Recheck All (Use with caution - processes all profiles)
-- ============================================
-- Uncomment to recheck all profiles (may take time with many profiles)
/*
SELECT 
  'Rechecking All Profiles' as test_name,
  public.recheck_all_giveaway_eligibility() as result;
*/

-- ============================================
-- 10. Verify Functions Exist
-- ============================================
SELECT 
  'Function Verification' as test_name,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%giveaway%'
ORDER BY routine_name;
