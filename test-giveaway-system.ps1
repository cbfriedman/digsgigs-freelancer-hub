# Test Script for Giveaway System
# This script helps verify the giveaway system is working correctly
# Run this after applying the migrations

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Giveaway System Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
$supabaseAvailable = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseAvailable) {
    Write-Host "⚠️  Supabase CLI not found. You'll need to run SQL queries manually." -ForegroundColor Yellow
    Write-Host "   Use the test-giveaway-system.sql file in your Supabase dashboard." -ForegroundColor Yellow
    Write-Host ""
    exit
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Test 1: Check if functions exist
Write-Host "Test 1: Verifying functions exist..." -ForegroundColor Yellow
$functionsCheck = supabase db execute "
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%giveaway%'
ORDER BY routine_name;
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions exist" -ForegroundColor Green
    Write-Host $functionsCheck
} else {
    Write-Host "❌ Error checking functions" -ForegroundColor Red
    Write-Host $functionsCheck
}
Write-Host ""

# Test 2: Get statistics
Write-Host "Test 2: Getting giveaway statistics..." -ForegroundColor Yellow
$stats = supabase db execute "SELECT public.get_giveaway_stats();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Statistics retrieved" -ForegroundColor Green
    Write-Host $stats
} else {
    Write-Host "❌ Error getting statistics" -ForegroundColor Red
    Write-Host $stats
}
Write-Host ""

# Test 3: Check eligible count
Write-Host "Test 3: Checking eligible digger count..." -ForegroundColor Yellow
$eligibleCount = supabase db execute "
SELECT COUNT(*) as eligible_count 
FROM public.digger_profiles 
WHERE is_giveaway_eligible = true;
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Eligible count retrieved" -ForegroundColor Green
    Write-Host $eligibleCount
} else {
    Write-Host "❌ Error getting eligible count" -ForegroundColor Red
    Write-Host $eligibleCount
}
Write-Host ""

# Test 4: Verify triggers
Write-Host "Test 4: Verifying triggers..." -ForegroundColor Yellow
$triggers = supabase db execute "
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%giveaway%'
ORDER BY trigger_name;
" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Triggers verified" -ForegroundColor Green
    Write-Host $triggers
} else {
    Write-Host "❌ Error checking triggers" -ForegroundColor Red
    Write-Host $triggers
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed testing, run test-giveaway-system.sql in your Supabase dashboard" -ForegroundColor Yellow
Write-Host ""
