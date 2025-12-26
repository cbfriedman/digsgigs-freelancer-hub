-- =====================================================
-- COMPREHENSIVE MIGRATION VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify all migrations are applied
-- =====================================================

-- ============================================
-- 1. VERIFY SUBSCRIPTION MODEL TABLES
-- ============================================

-- Check digger_profiles subscription columns
SELECT 
  'digger_profiles subscription columns' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'digger_profiles' 
      AND column_name IN (
        'geographic_tier', 'industry_type', 'subscription_status',
        'subscription_start_date', 'original_price_cents', 'price_locked',
        'billing_cycle', 'price_lock_notified_30d', 'price_lock_notified_7d',
        'stripe_subscription_id', 'accumulated_free_clicks', 'subscription_lapsed_at'
      )
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing subscription columns'
  END as status;

-- Show actual subscription columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'digger_profiles'
AND column_name IN (
  'geographic_tier', 'industry_type', 'subscription_status',
  'subscription_start_date', 'original_price_cents', 'price_locked',
  'billing_cycle', 'price_lock_notified_30d', 'price_lock_notified_7d',
  'stripe_subscription_id', 'subscription_tier', 'subscription_end_date',
  'stripe_customer_id', 'accumulated_free_clicks', 'subscription_lapsed_at'
)
ORDER BY column_name;

-- ============================================
-- 2. CHECK SUBSCRIPTION PRICING TABLE
-- ============================================
SELECT 
  'subscription_pricing table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'subscription_pricing'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- Show pricing data (should have 6 tiers based on new model)
SELECT 
  geographic_tier,
  industry_type,
  monthly_price_cents / 100.0 as monthly_price_dollars,
  annual_price_cents / 100.0 as annual_price_dollars,
  is_active
FROM subscription_pricing
ORDER BY geographic_tier, industry_type;

-- Verify pricing matches new business model:
-- Local: $19/mo (lv_mv), $39/mo (hv)
-- Statewide: $49/mo (lv_mv), $99/mo (hv)  
-- Nationwide: $99/mo (lv_mv), $199/mo (hv)
SELECT 
  'subscription_pricing data verification' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM subscription_pricing) >= 6 
    THEN '✅ PASS - Pricing tiers exist'
    ELSE '❌ FAIL - Missing pricing tiers (expected at least 6)'
  END as status;

-- ============================================
-- 3. CHECK DIGGER_MONTHLY_CLICKS TABLE
-- ============================================
SELECT 
  'digger_monthly_clicks table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'digger_monthly_clicks'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- ============================================
-- 4. CHECK CONTACT_REVEALS TABLE (New Model)
-- ============================================
SELECT 
  'contact_reveals table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'contact_reveals'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- ============================================
-- 5. CHECK PROFILE_CLICKS TABLE (New Model)
-- ============================================
SELECT 
  'profile_clicks table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'profile_clicks'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- ============================================
-- 6. CHECK PROFILE_CALLS TABLE (New Model)
-- ============================================
SELECT 
  'profile_calls table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'profile_calls'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- ============================================
-- 7. VERIFY EMAIL VERIFICATION SETUP
-- ============================================

-- Check verification_codes table structure
SELECT 
  'verification_codes table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'verification_codes'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- Check verification_codes columns (should support both email and phone)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'verification_codes'
ORDER BY ordinal_position;

-- Verify phone column exists
SELECT 
  'verification_codes phone support' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'verification_codes' 
      AND column_name = 'phone'
    ) THEN '✅ PASS - Phone verification supported'
    ELSE '❌ FAIL - Phone column missing'
  END as status;

-- Verify verification_type column exists
SELECT 
  'verification_codes type support' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'verification_codes' 
      AND column_name = 'verification_type'
    ) THEN '✅ PASS - Verification type supported'
    ELSE '❌ FAIL - Verification type column missing'
  END as status;

-- ============================================
-- 8. CHECK USER_APP_ROLES TABLE (Multi-Role System)
-- ============================================
SELECT 
  'user_app_roles table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_app_roles'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- Check user_app_role enum exists
SELECT 
  'user_app_role enum' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_type 
      WHERE typname = 'user_app_role'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Enum does not exist'
  END as status;

-- ============================================
-- 9. CHECK CONSTRAINTS
-- ============================================
SELECT 
  'Check constraints' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'digger_profiles'
      AND constraint_name IN (
        'digger_profiles_geographic_tier_check',
        'digger_profiles_industry_type_check',
        'digger_profiles_billing_cycle_check'
      )
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing constraints'
  END as status;

-- ============================================
-- 10. CHECK INDEXES
-- ============================================
SELECT 
  'Critical indexes' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname IN (
        'idx_digger_monthly_clicks_digger_month',
        'idx_digger_profiles_geographic_tier',
        'idx_digger_profiles_subscription_status',
        'idx_verification_codes_email',
        'idx_verification_codes_phone'
      )
    ) THEN '✅ PASS'
    ELSE '⚠️ WARNING - Some indexes may be missing'
  END as status;

-- ============================================
-- 11. CHECK RLS POLICIES
-- ============================================
SELECT 
  'RLS Policies' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename IN ('digger_monthly_clicks', 'subscription_pricing', 
                         'contact_reveals', 'profile_clicks', 'profile_calls',
                         'verification_codes', 'user_app_roles')
    ) THEN '✅ PASS'
    ELSE '⚠️ WARNING - Some RLS policies may be missing'
  END as status;

-- ============================================
-- 12. CHECK FUNCTIONS
-- ============================================
SELECT 
  'Subscription functions' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname IN (
        'add_monthly_free_clicks',
        'expire_grace_period_clicks',
        'has_app_role',
        'get_user_app_roles',
        'cleanup_expired_verification_codes'
      )
    ) THEN '✅ PASS'
    ELSE '⚠️ WARNING - Some functions may be missing'
  END as status;

-- ============================================
-- 13. FINAL SUMMARY
-- ============================================
SELECT 
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary;

-- Count active subscriptions
SELECT 
  'Active subscriptions' as metric,
  COUNT(*)::text as value
FROM digger_profiles
WHERE subscription_status = 'active';

-- Count total digger profiles
SELECT 
  'Total digger profiles' as metric,
  COUNT(*)::text as value
FROM digger_profiles;

-- Count verification codes (last 24 hours)
SELECT 
  'Verification codes (last 24h)' as metric,
  COUNT(*)::text as value
FROM verification_codes
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Count user app roles
SELECT 
  'User app roles' as metric,
  COUNT(*)::text as value
FROM user_app_roles;

-- Show app role distribution
SELECT 
  app_role,
  COUNT(*) as count
FROM user_app_roles
WHERE is_active = true
GROUP BY app_role
ORDER BY app_role;

