# Apply Critical Security Migrations Directly
# This script applies the security migrations to the remote database

Write-Host "🔒 Applying Critical Security Migrations..." -ForegroundColor Green
Write-Host "==========================================`n" -ForegroundColor Green

# Read the security migration files
$securityMigration1 = Get-Content "supabase\migrations\20251206000000_fix_security_issues.sql" -Raw
$securityMigration2 = Get-Content "supabase\migrations\20251206000001_add_otp_rate_limiting.sql" -Raw

# Combine migrations
$combinedMigration = $securityMigration1 + "`n`n-- ============================================`n" + $securityMigration2

# Write to temporary file
$tempFile = "temp_security_migration.sql"
$combinedMigration | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "📝 Created temporary migration file: $tempFile" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANT: This will apply security migrations directly to the database." -ForegroundColor Yellow
Write-Host "   Make sure you have a backup before proceeding.`n" -ForegroundColor Yellow

$confirm = Read-Host "Apply security migrations? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Cancelled." -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "`n🚀 Applying migrations..." -ForegroundColor Cyan

# Apply via Supabase CLI
try {
    # Use db execute to run the SQL directly
    Get-Content $tempFile | supabase db execute
    Write-Host "`n✅ Security migrations applied successfully!" -ForegroundColor Green
    
    # Mark migrations as applied
    Write-Host "`n📝 Marking migrations as applied..." -ForegroundColor Cyan
    supabase migration repair --status applied 20251206000000
    supabase migration repair --status applied 20251206000001
    
    Write-Host "✅ Migrations marked as applied!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Error applying migrations: $_" -ForegroundColor Red
    Write-Host "`n💡 You may need to apply these migrations manually via Supabase SQL Editor." -ForegroundColor Yellow
    Write-Host "   Files to apply:" -ForegroundColor Yellow
    Write-Host "   1. supabase\migrations\20251206000000_fix_security_issues.sql" -ForegroundColor Gray
    Write-Host "   2. supabase\migrations\20251206000001_add_otp_rate_limiting.sql" -ForegroundColor Gray
} finally {
    # Clean up
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "`nDone!" -ForegroundColor Green

