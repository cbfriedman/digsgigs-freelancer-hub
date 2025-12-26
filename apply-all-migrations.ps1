# =====================================================
# APPLY ALL MIGRATIONS TO EXTERNAL SUPABASE
# This script helps apply all migrations from Lovable to external Supabase
# =====================================================

Write-Host "`n🚀 Supabase Migration Application Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Get Supabase project details
$supabaseUrl = Read-Host "`nEnter your Supabase Project URL (e.g., https://xxxxx.supabase.co)"
$supabaseKey = Read-Host "Enter your Supabase Service Role Key (starts with eyJ...)"

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "`n❌ Error: Both URL and Service Role Key are required" -ForegroundColor Red
    exit 1
}

Write-Host "`n⚠️  IMPORTANT: This will apply all migrations to your Supabase database." -ForegroundColor Yellow
Write-Host "Make sure you have:" -ForegroundColor Yellow
Write-Host "  1. Backed up your database" -ForegroundColor Yellow
Write-Host "  2. Tested in a development environment first" -ForegroundColor Yellow
Write-Host "  3. Verified your Supabase URL and Service Role Key" -ForegroundColor Yellow

$confirm = Read-Host "`nContinue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`n❌ Cancelled by user" -ForegroundColor Red
    exit 0
}

# Get migrations directory
$migrationsDir = Join-Path $PSScriptRoot "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
    Write-Host "`n❌ Error: Migrations directory not found at: $migrationsDir" -ForegroundColor Red
    exit 1
}

# Get all migration files, sorted by name (which includes timestamp)
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

Write-Host "`n📋 Found $($migrationFiles.Count) migration files" -ForegroundColor Green

# Display migration files
Write-Host "`nMigration files to apply:" -ForegroundColor Cyan
foreach ($file in $migrationFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor Gray
}

Write-Host "`n💡 RECOMMENDATION: Apply migrations manually via Supabase SQL Editor for better control" -ForegroundColor Yellow
Write-Host "`nTo apply manually:" -ForegroundColor Cyan
Write-Host "  1. Go to Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "  2. Copy and paste each migration file content" -ForegroundColor White
Write-Host "  3. Run them in order (sorted by filename)" -ForegroundColor White
Write-Host "  4. Verify with verify-all-migrations.sql script" -ForegroundColor White

$applyNow = Read-Host "`nDo you want to generate a combined migration file? (yes/no)"
if ($applyNow -eq "yes") {
    $outputFile = Join-Path $PSScriptRoot "combined-migrations.sql"
    
    Write-Host "`n📝 Generating combined migration file..." -ForegroundColor Cyan
    
    $combinedContent = @"
-- =====================================================
-- COMBINED MIGRATION FILE
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Total migrations: $($migrationFiles.Count)
-- 
-- IMPORTANT: Review this file before applying!
-- Some migrations may have dependencies or conflicts.
-- =====================================================

"@
    
    foreach ($file in $migrationFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        $combinedContent += @"

-- =====================================================
-- Migration: $($file.Name)
-- =====================================================

$content

"@
    }
    
    [System.IO.File]::WriteAllText($outputFile, $combinedContent)
    
    Write-Host "`n✅ Combined migration file created: $outputFile" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Review the combined-migrations.sql file" -ForegroundColor White
    Write-Host "  2. Copy it to Supabase SQL Editor" -ForegroundColor White
    Write-Host "  3. Run it (or run sections individually)" -ForegroundColor White
    Write-Host "  4. Run verify-all-migrations.sql to verify" -ForegroundColor White
}

Write-Host "`n✅ Script completed!" -ForegroundColor Green
Write-Host "`n📚 Additional Resources:" -ForegroundColor Cyan
Write-Host "  - verify-all-migrations.sql: Verify all migrations are applied" -ForegroundColor White
Write-Host "  - verify-subscription-implementation.sql: Verify subscription model" -ForegroundColor White

