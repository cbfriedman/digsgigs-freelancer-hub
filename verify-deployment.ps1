# Deployment Verification Script
# Verifies that all components are properly deployed

Write-Host "🔍 Deployment Verification" -ForegroundColor Green
Write-Host "==========================`n" -ForegroundColor Green

$allPassed = $true

# Check Supabase connection
Write-Host "1. Checking Supabase connection..." -ForegroundColor Cyan
try {
    $supabaseStatus = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Supabase CLI connected" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Supabase CLI not connected. Run: supabase link" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ Supabase CLI not found" -ForegroundColor Red
    $allPassed = $false
}

# Check migrations
Write-Host "`n2. Checking database migrations..." -ForegroundColor Cyan
try {
    $migrations = supabase migration list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Can access migrations" -ForegroundColor Green
        
        # Check for security migrations
        if ($migrations -match "20251206000000_fix_security_issues") {
            Write-Host "   ✅ Security migration found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Security migration not found in list" -ForegroundColor Yellow
        }
        
        if ($migrations -match "20251206000001_add_otp_rate_limiting") {
            Write-Host "   ✅ OTP rate limiting migration found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  OTP rate limiting migration not found in list" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Cannot access migrations" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ Error checking migrations" -ForegroundColor Red
    $allPassed = $false
}

# Check Edge Functions
Write-Host "`n3. Checking Edge Functions..." -ForegroundColor Cyan
$requiredFunctions = @(
    "send-otp",
    "verify-custom-otp",
    "create-lead-purchase-checkout",
    "award-lead",
    "match-leads-to-diggers",
    "stripe-webhook-lead-purchase"
)

try {
    $functions = supabase functions list 2>&1
    if ($LASTEXITCODE -eq 0) {
        foreach ($func in $requiredFunctions) {
            if ($functions -match $func) {
                Write-Host "   ✅ $func deployed" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $func not found" -ForegroundColor Yellow
                $allPassed = $false
            }
        }
    } else {
        Write-Host "   ⚠️  Cannot list functions" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ Error checking functions" -ForegroundColor Red
    $allPassed = $false
}

# Check build
Write-Host "`n4. Checking frontend build..." -ForegroundColor Cyan
if (Test-Path "dist") {
    if (Test-Path "dist/index.html") {
        Write-Host "   ✅ Frontend build exists" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Build directory exists but index.html not found" -ForegroundColor Yellow
        $allPassed = $false
    }
} else {
    Write-Host "   ⚠️  No build directory. Run: npm run build" -ForegroundColor Yellow
    $allPassed = $false
}

# Check environment file
Write-Host "`n5. Checking environment configuration..." -ForegroundColor Cyan
if (Test-Path ".env.local") {
    Write-Host "   ✅ .env.local file exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env.local not found (may be in Vercel)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" + "="*50 -ForegroundColor Gray
if ($allPassed) {
    Write-Host "✅ All checks passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some checks failed. Review the output above." -ForegroundColor Yellow
}
Write-Host "="*50 -ForegroundColor Gray

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review any warnings above" -ForegroundColor White
Write-Host "   2. Complete configuration (see configure-environment.ps1)" -ForegroundColor White
Write-Host "   3. Deploy (see deploy.ps1)" -ForegroundColor White
Write-Host "   4. Run smoke tests (see FINAL_PRE_LAUNCH_CHECKLIST.md)" -ForegroundColor White

