# Supabase Edge Functions Deployment Script
# This script helps deploy all edge functions after secret configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Edge Functions Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "  Install: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "This script will deploy all edge functions." -ForegroundColor Yellow
Write-Host "Make sure all secrets are configured in Supabase Dashboard first!" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying all edge functions..." -ForegroundColor Cyan
Write-Host ""

# Deploy all functions
try {
    supabase functions deploy --all
    Write-Host ""
    Write-Host "✓ All functions deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ Deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify all secrets are set in Supabase Dashboard" -ForegroundColor Yellow
Write-Host "2. Test critical functions (send-otp-email, chat-bot)" -ForegroundColor Yellow
Write-Host "3. Check function logs for any errors" -ForegroundColor Yellow
Write-Host "4. Disable auto-confirm email once OTP is working" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

