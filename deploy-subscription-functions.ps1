# Deploy Subscription Functions Script
# This script deploys the subscription-related edge functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Subscription Functions Deployment" -ForegroundColor Cyan
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
Write-Host "This script will deploy subscription-related functions:" -ForegroundColor Yellow
Write-Host "  - create-geo-subscription-checkout" -ForegroundColor Yellow
Write-Host "  - stripe-webhook-geo-subscription" -ForegroundColor Yellow
Write-Host "  - check-geo-subscription" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Make sure these secrets are configured in Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   - STRIPE_SECRET_KEY" -ForegroundColor Yellow
Write-Host "   - STRIPE_WEBHOOK_SECRET (for webhook function)" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying subscription functions..." -ForegroundColor Cyan
Write-Host ""

$functions = @(
    "create-geo-subscription-checkout",
    "stripe-webhook-geo-subscription",
    "check-geo-subscription"
)

$failed = @()

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    try {
        supabase functions deploy $func
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $func deployed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ $func deployment failed" -ForegroundColor Red
            $failed += $func
        }
    } catch {
        Write-Host "✗ $func deployment failed: $_" -ForegroundColor Red
        $failed += $func
    }
    Write-Host ""
}

if ($failed.Count -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ All subscription functions deployed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Verify secrets are set in Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "2. Configure Stripe webhook endpoint:" -ForegroundColor Yellow
    Write-Host "   URL: https://[your-project].supabase.co/functions/v1/stripe-webhook-geo-subscription" -ForegroundColor Yellow
    Write-Host "   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted" -ForegroundColor Yellow
    Write-Host "3. Test subscription flow end-to-end" -ForegroundColor Yellow
    Write-Host "4. Check function logs for any errors" -ForegroundColor Yellow
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ Some functions failed to deploy:" -ForegroundColor Red
    foreach ($func in $failed) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

