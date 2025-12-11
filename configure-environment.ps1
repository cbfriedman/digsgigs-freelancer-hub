# Environment Configuration Helper Script
# PowerShell script to help configure environment variables

Write-Host "🔧 Environment Configuration Helper" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Green

# Check if Supabase CLI is installed
Write-Host "Checking prerequisites..." -ForegroundColor Cyan
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI not found. Install from: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
} else {
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
}

if (-not $vercelInstalled) {
    Write-Host "⚠️  Vercel CLI not found. Install with: npm i -g vercel" -ForegroundColor Yellow
} else {
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
}

Write-Host "`n📋 Configuration Checklist:`n" -ForegroundColor Cyan

# Resend API Key
Write-Host "1. Resend API Key (REQUIRED for email OTP)" -ForegroundColor Yellow
Write-Host "   Steps:" -ForegroundColor White
Write-Host "   a) Get API key from: https://resend.com/api-keys" -ForegroundColor Gray
Write-Host "   b) Add to Vercel: Project Settings → Environment Variables" -ForegroundColor Gray
Write-Host "      Name: RESEND_API_KEY" -ForegroundColor Gray
Write-Host "      Value: re_xxxxxxxxxxxxx" -ForegroundColor Gray
Write-Host "   c) Add to Supabase: Project Settings → Edge Functions → Secrets" -ForegroundColor Gray
Write-Host "      Name: RESEND_API_KEY" -ForegroundColor Gray
Write-Host "      Value: re_xxxxxxxxxxxxx" -ForegroundColor Gray
Write-Host "   d) Verify domain in Resend dashboard" -ForegroundColor Gray

$resendKey = Read-Host "`n   Enter Resend API key (or press Enter to skip)"
if ($resendKey) {
    Write-Host "   ✅ Key provided. Add it to Vercel and Supabase manually." -ForegroundColor Green
    Write-Host "   📝 Key: $resendKey" -ForegroundColor Gray
}

# Stripe Configuration
Write-Host "`n2. Stripe Configuration (REQUIRED for payments)" -ForegroundColor Yellow
Write-Host "   Steps:" -ForegroundColor White
Write-Host "   a) Get keys from: https://dashboard.stripe.com/apikeys" -ForegroundColor Gray
Write-Host "   b) Add to Supabase: Project Settings → Edge Functions → Secrets" -ForegroundColor Gray
Write-Host "      - STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host "      - STRIPE_WEBHOOK_SECRET" -ForegroundColor Gray

# Supabase Configuration
Write-Host "`n3. Supabase Configuration" -ForegroundColor Yellow
Write-Host "   Steps:" -ForegroundColor White
Write-Host "   a) Get keys from: Supabase Dashboard → Project Settings → API" -ForegroundColor Gray
Write-Host "   b) Add to Vercel: Project Settings → Environment Variables" -ForegroundColor Gray
Write-Host "      - VITE_SUPABASE_URL" -ForegroundColor Gray
Write-Host "      - VITE_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Gray

# Google Analytics (Optional)
Write-Host "`n4. Google Analytics (OPTIONAL)" -ForegroundColor Yellow
Write-Host "   Steps:" -ForegroundColor White
Write-Host "   a) Get Measurement ID from: Google Analytics 4" -ForegroundColor Gray
Write-Host "   b) Add to Vercel: VITE_GA_MEASUREMENT_ID" -ForegroundColor Gray
Write-Host "   c) Update index.html with your Measurement ID" -ForegroundColor Gray

# Twilio (Optional)
Write-Host "`n5. Twilio Configuration (OPTIONAL for SMS OTP)" -ForegroundColor Yellow
Write-Host "   Steps:" -ForegroundColor White
Write-Host "   a) Get credentials from: https://console.twilio.com/" -ForegroundColor Gray
Write-Host "   b) Add to Supabase: Project Settings → Edge Functions → Secrets" -ForegroundColor Gray
Write-Host "      - TWILIO_ACCOUNT_SID" -ForegroundColor Gray
Write-Host "      - TWILIO_AUTH_TOKEN" -ForegroundColor Gray
Write-Host "      - TWILIO_PHONE_NUMBER" -ForegroundColor Gray

Write-Host "`n✅ Configuration Guide Complete!" -ForegroundColor Green
Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Complete the configuration steps above" -ForegroundColor White
Write-Host "   2. Run: .\deploy.ps1" -ForegroundColor White
Write-Host "   3. Test OTP email flow" -ForegroundColor White
Write-Host "   4. Run smoke tests" -ForegroundColor White

Write-Host "`n📚 For detailed instructions, see: DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan

