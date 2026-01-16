-- Migration Verification Script
-- Run this after completing all migrations to verify everything is set up correctly

-- ============================================
-- 1. VERIFY DATABASE TABLES
-- ============================================

-- Check if all new tables exist
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASS'
        ELSE '❌ FAIL - Missing tables'
    END as status,
    COUNT(*) as found_count,
    'Expected: 5 tables' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
);

-- List all new tables
SELECT 
    'New Tables' as check_type,
    table_name,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
)
ORDER BY table_name;

-- ============================================
-- 2. VERIFY BIDS TABLE COLUMNS
-- ============================================

-- Check new columns in bids table
SELECT 
    'Bids Columns Check' as check_type,
    CASE 
        WHEN COUNT(*) = 7 THEN '✅ PASS'
        ELSE '❌ FAIL - Missing columns'
    END as status,
    COUNT(*) as found_count,
    'Expected: 7 new columns' as expected
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN (
    'pricing_model',
    'referral_fee_rate',
    'referral_fee_cap_cents',
    'referral_fee_charged_at',
    'referral_fee_cents',
    'amount_min',
    'amount_max'
);

-- List all new columns in bids
SELECT 
    'Bids New Columns' as check_type,
    column_name,
    data_type,
    is_nullable,
    '✅ EXISTS' as status
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN (
    'pricing_model',
    'referral_fee_rate',
    'referral_fee_cap_cents',
    'referral_fee_charged_at',
    'referral_fee_cents',
    'amount_min',
    'amount_max'
)
ORDER BY column_name;

-- ============================================
-- 3. VERIFY RLS POLICIES
-- ============================================

-- Check RLS is enabled on new tables
SELECT 
    'RLS Check' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
)
ORDER BY tablename;

-- Count policies on new tables
SELECT 
    'RLS Policies Count' as check_type,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
        ELSE '❌ NO POLICIES'
    END as status
FROM pg_policies 
WHERE tablename IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. VERIFY INDEXES
-- ============================================

-- Check indexes on new tables
SELECT 
    'Indexes Check' as check_type,
    tablename,
    indexname,
    '✅ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
)
ORDER BY tablename, indexname;

-- ============================================
-- 5. VERIFY CONSTRAINTS
-- ============================================

-- Check constraints on referral_payments
SELECT 
    'Constraints Check' as check_type,
    conname as constraint_name,
    contype as constraint_type,
    '✅ EXISTS' as status
FROM pg_constraint 
WHERE conrelid = 'public.referral_payments'::regclass
ORDER BY conname;

-- Check constraints on bids table (pricing_model check)
SELECT 
    'Bids Constraints' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition,
    '✅ EXISTS' as status
FROM pg_constraint 
WHERE conrelid = 'public.bids'::regclass
AND conname LIKE '%pricing_model%';

-- ============================================
-- 6. VERIFY TEST DATA SEEDING
-- ============================================

-- Check test results are seeded
SELECT 
    'Test Data Seeding' as check_type,
    environment,
    COUNT(*) as test_count,
    CASE 
        WHEN COUNT(*) = 62 THEN '✅ CORRECT COUNT'
        ELSE '❌ INCORRECT COUNT'
    END as status
FROM manual_test_results 
GROUP BY environment
ORDER BY environment;

-- Check test categories
SELECT 
    'Test Categories' as check_type,
    test_category,
    COUNT(*) as test_count,
    '✅ EXISTS' as status
FROM manual_test_results 
GROUP BY test_category
ORDER BY test_category;

-- ============================================
-- 7. VERIFY STORAGE BUCKET
-- ============================================

-- Check test-screenshots bucket exists
SELECT 
    'Storage Bucket' as check_type,
    id as bucket_id,
    public,
    CASE 
        WHEN id = 'test-screenshots' THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM storage.buckets 
WHERE id = 'test-screenshots';

-- ============================================
-- 8. VERIFY TRIGGERS
-- ============================================

-- Check updated_at triggers
SELECT 
    'Triggers Check' as check_type,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    '✅ EXISTS' as status
FROM pg_trigger 
WHERE tgname LIKE '%update_%updated_at%'
AND tgrelid::regclass::text IN (
    'public.pre_award_conversations',
    'public.manual_test_results'
);

-- ============================================
-- 9. SUMMARY REPORT
-- ============================================

SELECT 
    '=== MIGRATION VERIFICATION SUMMARY ===' as summary;

SELECT 
    'Tables' as component,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 5 THEN '✅' ELSE '❌' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
);

SELECT 
    'Bids Columns' as component,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 7 THEN '✅' ELSE '❌' END as status
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN (
    'pricing_model',
    'referral_fee_rate',
    'referral_fee_cap_cents',
    'referral_fee_charged_at',
    'referral_fee_cents',
    'amount_min',
    'amount_max'
);

SELECT 
    'RLS Enabled' as component,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 5 THEN '✅' ELSE '❌' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'referral_payments',
    'pre_award_conversations',
    'pre_award_messages',
    'message_violations',
    'manual_test_results'
)
AND rowsecurity = true;

SELECT 
    'Test Data' as component,
    COUNT(DISTINCT environment) as environments,
    SUM(CASE WHEN environment = 'lovable_preview' THEN 1 ELSE 0 END) as preview_tests,
    SUM(CASE WHEN environment = 'vercel_production' THEN 1 ELSE 0 END) as production_tests,
    CASE 
        WHEN COUNT(*) >= 124 THEN '✅' 
        ELSE '❌' 
    END as status
FROM manual_test_results;

-- ============================================
-- END OF VERIFICATION
-- ============================================
