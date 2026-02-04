# Deployment Script for Digs and Gigs Platform
# PowerShell script for Windows

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Green

# Step 1: Deploy Database Migrations
Write-Host "`n📦 Step 1: Deploying Database Migrations..." -ForegroundColor Cyan
try {
    supabase db push
    Write-Host "✅ Migrations deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy Edge Functions
Write-Host "`n⚡ Step 2: Deploying Edge Functions..." -ForegroundColor Cyan
$functions = @(
    "send-otp",
    "verify-custom-otp",
    "send-welcome-email",
    "record-email-unsubscribe",
    "create-lead-purchase-checkout",
    "award-lead",
    "match-leads-to-diggers",
    "stripe-webhook-lead-purchase",
    "send-gig-confirmation",
    "elevenlabs-conversation-token"
)

foreach ($func in $functions) {
    Write-Host "  Deploying $func..." -ForegroundColor Yellow
    try {
        supabase functions deploy $func
        Write-Host "  ✅ $func deployed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ $func deployment failed: $_" -ForegroundColor Red
    }
}

# Step 3: Build Frontend
Write-Host "`n🏗️  Step 3: Building Frontend..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to Vercel
Write-Host "`n🌐 Step 4: Deploying to Vercel..." -ForegroundColor Cyan
Write-Host "⚠️  Note: Make sure you're logged into Vercel CLI" -ForegroundColor Yellow
Write-Host "   Run: vercel login (if not already logged in)" -ForegroundColor Yellow

$deploy = Read-Host "Deploy to Vercel now? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    try {
        vercel --prod
        Write-Host "✅ Frontend deployed to Vercel" -ForegroundColor Green
    } catch {
        Write-Host "❌ Vercel deployment failed: $_" -ForegroundColor Red
        Write-Host "   You can deploy manually by pushing to GitHub" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping Vercel deployment" -ForegroundColor Yellow
    Write-Host "   Deploy manually: vercel --prod or push to GitHub" -ForegroundColor Yellow
}

Write-Host "`n✅ Deployment Process Complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Verify environment variables in Vercel" -ForegroundColor White
Write-Host "   2. Verify Supabase secrets are set" -ForegroundColor White
Write-Host "   3. Test OTP email flow" -ForegroundColor White
Write-Host "   4. Test payment flow" -ForegroundColor White
Write-Host "   5. Run smoke tests" -ForegroundColor White

