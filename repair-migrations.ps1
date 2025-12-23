# Script to repair Supabase migration history
# This marks all local migrations as "applied" in the remote database migration history

Write-Host "Repairing Supabase migration history..." -ForegroundColor Cyan
Write-Host ""

# Get all migration files and extract their timestamps
$migrationFiles = Get-ChildItem supabase\migrations\*.sql | Sort-Object Name
$migrationTimestamps = $migrationFiles | ForEach-Object {
    $name = $_.BaseName
    if ($name -match '^(\d{14})') {
        $matches[1]
    }
} | Select-Object -Unique

$totalMigrations = $migrationTimestamps.Count
$current = 0
$errors = @()

Write-Host "Found $totalMigrations migrations to repair" -ForegroundColor Yellow
Write-Host ""

foreach ($timestamp in $migrationTimestamps) {
    $current++
    $percent = [math]::Round(($current / $totalMigrations) * 100, 1)
    Write-Host "[$current/$totalMigrations] ($percent%) Repairing migration $timestamp..." -ForegroundColor Gray
    
    $result = supabase migration repair --status applied $timestamp 2>&1
    if ($LASTEXITCODE -ne 0) {
        $errorMessage = $result | Out-String
        Write-Host "  ⚠️  Warning: $errorMessage" -ForegroundColor Yellow
        $errors += @{
            Migration = $timestamp
            Error = $errorMessage
        }
    } else {
        Write-Host "  ✅ Repaired" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Repair Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total migrations processed: $totalMigrations" -ForegroundColor White
Write-Host "Errors encountered: $($errors.Count)" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Yellow" })

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $($error.Migration): $($error.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify with: supabase migration list --linked" -ForegroundColor Gray
Write-Host "2. Test db pull: supabase db pull test_migration" -ForegroundColor Gray

