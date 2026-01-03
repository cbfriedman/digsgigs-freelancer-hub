-- Database State Verification Script
-- Run this in Supabase SQL Editor to check if migrations have been applied correctly

-- ============================================
-- 1. Check if user_app_role enum includes 'admin'
-- ============================================
SELECT 
  'Enum Values Check' as check_type,
  enumlabel as enum_value,
  enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = 'user_app_role'::regtype
ORDER BY enumsortorder;

-- Expected: Should see 'digger', 'gigger', 'telemarketer', 'admin'

-- ============================================
-- 2. Check if critical functions exist
-- ============================================
SELECT 
  'Function Existence Check' as check_type,
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc 
WHERE proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin', 'get_user_app_roles')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- Expected: Should see all 4 functions, with has_app_role, get_user_app_roles_safe, and is_admin as SECURITY DEFINER

-- ============================================
-- 3. Check RLS policies on user_app_roles table
-- ============================================
SELECT 
  'RLS Policy Check' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user_app_roles'
ORDER BY policyname;

-- Expected: Should see policies for SELECT, INSERT, UPDATE

-- ============================================
-- 4. Check if user_app_roles table exists and has correct structure
-- ============================================
SELECT 
  'Table Structure Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_app_roles'
ORDER BY ordinal_position;

-- Expected: Should see id, user_id, app_role, is_active, last_used_at, created_at

-- ============================================
-- 5. Check function definitions (verify SECURITY DEFINER)
-- ============================================
SELECT 
  'Function Definition Check' as check_type,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin')
ORDER BY p.proname;

-- Expected: Should see SECURITY DEFINER in function definitions

-- ============================================
-- 6. Test function calls (if authenticated)
-- ============================================
-- Uncomment and run with a test user_id:
-- SELECT has_app_role('YOUR_USER_ID_HERE'::uuid, 'admin'::user_app_role);
-- SELECT * FROM get_user_app_roles_safe('YOUR_USER_ID_HERE'::uuid);
-- SELECT is_admin('YOUR_USER_ID_HERE'::uuid);

-- ============================================
-- 7. Check for admin user (frostwebdev@gmail.com)
-- ============================================
SELECT 
  'Admin User Check' as check_type,
  u.id as user_id,
  u.email,
  uar.app_role,
  uar.is_active,
  uar.last_used_at
FROM auth.users u
LEFT JOIN public.user_app_roles uar ON u.id = uar.user_id AND uar.app_role = 'admin'
WHERE u.email = 'frostwebdev@gmail.com';

-- Expected: Should see user with admin role and is_active = true

-- ============================================
-- 8. Check for any RLS recursion issues
-- ============================================
-- This query checks if policies reference functions that might cause recursion
SELECT 
  'RLS Recursion Check' as check_type,
  tablename,
  policyname,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'user_app_roles'
  AND qual LIKE '%has_app_role%'
  OR qual LIKE '%get_user_app_roles%';

-- Expected: Should be empty (policies should NOT call these functions to avoid recursion)

-- ============================================
-- Summary Report
-- ============================================
SELECT 
  'SUMMARY' as report_section,
  'Run all checks above and verify:' as instructions,
  '1. Enum includes admin value' as check_1,
  '2. All functions exist and are SECURITY DEFINER' as check_2,
  '3. RLS policies are simple (no function calls)' as check_3,
  '4. Admin user has admin role' as check_4,
  '5. No recursion in RLS policies' as check_5;
