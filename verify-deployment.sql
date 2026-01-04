-- ============================================
-- Deployment Verification Script
-- Run this in Supabase SQL Editor to check what's been applied
-- ============================================

-- 1. Check if critical RPC functions exist
SELECT 
  'RPC Functions Check' as check_type,
  proname as function_name,
  CASE 
    WHEN prosecdef = true THEN '✅ SECURITY DEFINER (Correct)'
    ELSE '❌ NOT SECURITY DEFINER (Wrong!)'
  END as status,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN (
  'has_app_role',
  'get_user_app_roles_safe',
  'is_admin',
  'insert_user_app_role'
)
ORDER BY proname;

-- 2. Check RLS policies on user_app_roles
SELECT 
  'RLS Policies Check' as check_type,
  policyname as policy_name,
  cmd as command_type,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as policy_details
FROM pg_policies 
WHERE tablename = 'user_app_roles'
ORDER BY policyname;

-- 3. Check if user_app_roles table exists and has RLS enabled
SELECT 
  'Table RLS Status' as check_type,
  schemaname || '.' || tablename as table_name,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'user_app_roles'
  AND schemaname = 'public';

-- 4. Check function permissions
SELECT 
  'Function Permissions' as check_type,
  p.proname as function_name,
  r.rolname as owner_role,
  CASE 
    WHEN r.rolname = 'postgres' OR r.rolname = 'supabase_admin' THEN '✅ Correct Owner'
    ELSE '⚠️ Check Owner'
  END as owner_status
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname IN (
  'get_user_app_roles_safe',
  'insert_user_app_role',
  'has_app_role',
  'is_admin'
)
ORDER BY p.proname;

-- 5. Summary
SELECT 
  'SUMMARY' as check_type,
  COUNT(*) FILTER (WHERE proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin', 'insert_user_app_role') AND prosecdef = true) as functions_ok,
  COUNT(*) FILTER (WHERE proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin', 'insert_user_app_role')) as total_functions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin', 'insert_user_app_role') AND prosecdef = true) = 4 
    THEN '✅ All critical functions exist and are SECURITY DEFINER'
    ELSE '❌ Missing or incorrect functions - apply migrations!'
  END as overall_status
FROM pg_proc
WHERE proname IN ('has_app_role', 'get_user_app_roles_safe', 'is_admin', 'insert_user_app_role');
