# Subscription Setup Verification Script
# This script verifies that all subscription components are properly configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Subscription Setup Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check if supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI not found" -ForegroundColor Red
    $errors += "Supabase CLI not installed"
}

Write-Host ""
Write-Host "Checking function files..." -ForegroundColor Cyan

# Check if functions exist
$functions = @(
    "supabase/functions/create-geo-subscription-checkout/index.ts",
    "supabase/functions/stripe-webhook-geo-subscription/index.ts",
    "supabase/functions/check-geo-subscription/index.ts"
)

foreach ($func in $functions) {
    if (Test-Path $func) {
        Write-Host "✓ $func exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $func not found" -ForegroundColor Red
        $errors += "Function file missing: $func"
    }
}

Write-Host ""
Write-Host "Checking frontend files..." -ForegroundColor Cyan

# Check frontend files
$frontendFiles = @(
    "src/pages/Subscription.tsx",
    "src/pages/SubscriptionSuccess.tsx"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file not found" -ForegroundColor Red
        $errors += "Frontend file missing: $file"
    }
}

Write-Host ""
Write-Host "Checking route configuration..." -ForegroundColor Cyan

# Check if routes are configured
$appTsx = Get-Content "src/App.tsx" -Raw
if ($appTsx -match "subscription-success") {
    Write-Host "✓ Subscription success route configured" -ForegroundColor Green
} else {
    Write-Host "✗ Subscription success route not found" -ForegroundColor Red
    $errors += "Route /subscription-success not configured in App.tsx"
}

Write-Host ""
Write-Host "Checking Stripe price IDs..." -ForegroundColor Cyan

# Check price IDs in function
$checkoutFunction = Get-Content "supabase/functions/create-geo-subscription-checkout/index.ts" -Raw
$priceIds = @(
    "price_1ShJOkRuFpm7XGfuldUtDYCW",
    "price_1ShJOyRuFpm7XGfuBzBRR8jh",
    "price_1ShJPxRuFpm7XGfuFsl8EDpz",
    "price_1ShJQrRuFpm7XGfuzHnllY63",
    "price_1ShJR4RuFpm7XGfuDnd5zQBW",
    "price_1ShJRFRuFpm7XGfuH23MrcKN",
    "price_1ShJRTRuFpm7XGfuOeU7QREH",
    "price_1ShJRhRuFpm7XGfupcbZV55Z",
    "price_1ShJRuRuFpm7XGfuD6GZfhv2",
    "price_1ShJT2RuFpm7XGfueqAqc2DP",
    "price_1ShJTnRuFpm7XGfuMQPfNwDk",
    "price_1ShJU2RuFpm7XGfu9oO3NF4Y"
)

$missingPrices = @()
foreach ($priceId in $priceIds) {
    if ($checkoutFunction -match [regex]::Escape($priceId)) {
        Write-Host "✓ Price ID found: $priceId" -ForegroundColor Green
    } else {
        Write-Host "✗ Price ID missing: $priceId" -ForegroundColor Red
        $missingPrices += $priceId
    }
}

if ($missingPrices.Count -gt 0) {
    $warnings += "Some price IDs are missing. Verify they match your Stripe products."
}

Write-Host ""
Write-Host "Checking CORS configuration..." -ForegroundColor Cyan

# Check CORS origins
$allowedOrigins = @(
    "https://www.digsandgigs.net",
    "https://digsandgigs.net",
    "https://www.digsandgigs.com",
    "https://digsandgigs.com"
)

foreach ($origin in $allowedOrigins) {
    if ($checkoutFunction -match [regex]::Escape($origin)) {
        Write-Host "✓ Origin allowed: $origin" -ForegroundColor Green
    } else {
        Write-Host "⚠ Origin not found: $origin" -ForegroundColor Yellow
        $warnings += "Origin not in allowed list: $origin"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Deploy functions: .\deploy-subscription-functions.ps1" -ForegroundColor Yellow
    Write-Host "2. Set secrets in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   - STRIPE_SECRET_KEY" -ForegroundColor Yellow
    Write-Host "   - STRIPE_WEBHOOK_SECRET" -ForegroundColor Yellow
    Write-Host "3. Configure Stripe webhook endpoint" -ForegroundColor Yellow
    Write-Host "4. Test subscription flow" -ForegroundColor Yellow
} else {
    if ($errors.Count -gt 0) {
        Write-Host "✗ Errors found:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  - $error" -ForegroundColor Red
        }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "⚠ Warnings:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    exit 1
}

