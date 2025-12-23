-- Quick Verification Script for Subscription Implementation
-- Run this in Supabase SQL Editor to verify all tables and columns exist

-- ============================================
-- 1. CHECK digger_profiles SUBSCRIPTION COLUMNS
-- ============================================
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
        'stripe_subscription_id'
      )
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing columns'
  END as status;

-- Show actual columns
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
  'stripe_customer_id'
)
ORDER BY column_name;

-- ============================================
-- 2. CHECK digger_monthly_clicks TABLE
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

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'digger_monthly_clicks'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK subscription_pricing TABLE
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

-- Show pricing data
SELECT 
  geographic_tier,
  industry_type,
  monthly_price_cents / 100.0 as monthly_price_dollars,
  annual_price_cents / 100.0 as annual_price_dollars,
  is_active
FROM subscription_pricing
ORDER BY geographic_tier, industry_type;

-- Verify all 6 pricing tiers exist
SELECT 
  'subscription_pricing data' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM subscription_pricing) = 6 
    THEN '✅ PASS - All 6 tiers exist'
    ELSE '❌ FAIL - Missing pricing tiers (expected 6, found ' || 
         (SELECT COUNT(*) FROM subscription_pricing) || ')'
  END as status;

-- ============================================
-- 4. CHECK profile_views TABLE
-- ============================================
SELECT 
  'profile_views table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'profile_views'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Table does not exist'
  END as status;

-- ============================================
-- 5. CHECK INDEXES
-- ============================================
SELECT 
  'Indexes' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname IN (
        'idx_digger_monthly_clicks_digger_month',
        'idx_digger_profiles_geographic_tier',
        'idx_digger_profiles_subscription_status'
      )
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing indexes'
  END as status;

-- Show all subscription-related indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%subscription%' 
   OR indexname LIKE '%digger_monthly_clicks%'
   OR indexname LIKE '%geographic_tier%'
ORDER BY tablename, indexname;

-- ============================================
-- 6. CHECK CONSTRAINTS
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

-- Show constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'digger_profiles'
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%geographic%' 
   OR tc.constraint_name LIKE '%industry%'
   OR tc.constraint_name LIKE '%billing%'
ORDER BY tc.constraint_name;

-- ============================================
-- 7. CHECK RLS POLICIES
-- ============================================
SELECT 
  'RLS Policies' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'digger_monthly_clicks'
      AND policyname LIKE '%click%'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing RLS policies'
  END as status;

-- Show RLS policies for subscription tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('digger_monthly_clicks', 'subscription_pricing', 'profile_views')
ORDER BY tablename, policyname;

-- ============================================
-- 8. CHECK TRIGGERS
-- ============================================
SELECT 
  'Triggers' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name IN (
        'update_digger_monthly_clicks_updated_at',
        'update_subscription_pricing_updated_at'
      )
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Missing triggers'
  END as status;

-- Show triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%digger_monthly_clicks%'
   OR trigger_name LIKE '%subscription_pricing%'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 9. SAMPLE DATA CHECK
-- ============================================
-- Check if any diggers have subscriptions
SELECT 
  'Sample subscription data' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM digger_profiles 
      WHERE subscription_status = 'active'
    ) THEN '✅ PASS - Active subscriptions found'
    WHEN EXISTS (
      SELECT 1 FROM digger_profiles 
      WHERE subscription_status IS NOT NULL
    ) THEN '⚠️ WARNING - Subscriptions exist but none active'
    ELSE 'ℹ️ INFO - No subscriptions yet (this is OK for new setup)'
  END as status;

-- Show subscription distribution
SELECT 
  subscription_status,
  COUNT(*) as count,
  COUNT(CASE WHEN price_locked = true THEN 1 END) as price_locked_count
FROM digger_profiles
GROUP BY subscription_status;

-- Show geographic tier distribution
SELECT 
  geographic_tier,
  industry_type,
  COUNT(*) as count
FROM digger_profiles
WHERE subscription_status = 'active'
GROUP BY geographic_tier, industry_type
ORDER BY geographic_tier, industry_type;

-- ============================================
-- 10. FINAL SUMMARY
-- ============================================
SELECT 
  '=== IMPLEMENTATION VERIFICATION SUMMARY ===' as summary;

SELECT 
  'Total checks completed' as metric,
  '10' as value;

-- Count active subscriptions
SELECT 
  'Active subscriptions' as metric,
  COUNT(*)::text as value
FROM digger_profiles
WHERE subscription_status = 'active';

-- Count click records
SELECT 
  'Click tracking records' as metric,
  COUNT(*)::text as value
FROM digger_monthly_clicks;

-- Count profile views
SELECT 
  'Profile views (last 7 days)' as metric,
  COUNT(*)::text as value
FROM profile_views
WHERE viewed_at > NOW() - INTERVAL '7 days';

