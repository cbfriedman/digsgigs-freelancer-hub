# PowerShell Script to Test Edge Functions
# This script helps test the send-otp-email and verify-custom-otp functions

param(
    [string]$Email = "test@example.com",
    [string]$AnonKey = "",
    [string]$ProjectRef = "ibyhvkfrbdwrnxutnkdy"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Edge Functions Testing Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if anon key is provided
if ([string]::IsNullOrEmpty($AnonKey)) {
    Write-Host "⚠️  Anon key not provided. Getting from Supabase config..." -ForegroundColor Yellow
    # Try to get from .env or config
    $AnonKey = Read-Host "Enter your Supabase Anon Key (or press Enter to skip)"
}

if ([string]::IsNullOrEmpty($AnonKey)) {
    Write-Host "❌ Anon key is required for testing. Exiting." -ForegroundColor Red
    exit 1
}

$BaseUrl = "https://$ProjectRef.supabase.co/functions/v1"
$Headers = @{
    "Authorization" = "Bearer $AnonKey"
    "Content-Type" = "application/json"
}

Write-Host "Testing with:" -ForegroundColor Cyan
Write-Host "  Email: $Email" -ForegroundColor Gray
Write-Host "  Project: $ProjectRef" -ForegroundColor Gray
Write-Host ""

# Test 1: Send OTP Email
Write-Host "Test 1: Sending OTP Email..." -ForegroundColor Yellow
$OtpCode = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
$SendOtpBody = @{
    email = $Email
    code = $OtpCode
    name = "Test User"
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$BaseUrl/send-otp-email" `
        -Method Post `
        -Headers $Headers `
        -Body $SendOtpBody
    
    Write-Host "✅ OTP Email sent successfully!" -ForegroundColor Green
    Write-Host "   Code sent: $OtpCode" -ForegroundColor Gray
    Write-Host "   Response: $($Response | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""
    
    # Wait a bit for email to be sent
    Write-Host "⏳ Waiting 3 seconds for email delivery..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Test 2: Verify OTP Code
    Write-Host "Test 2: Verifying OTP Code..." -ForegroundColor Yellow
    $VerifyOtpBody = @{
        email = $Email
        code = $OtpCode
    } | ConvertTo-Json
    
    $VerifyResponse = Invoke-RestMethod -Uri "$BaseUrl/verify-custom-otp" `
        -Method Post `
        -Headers $Headers `
        -Body $VerifyOtpBody
    
    Write-Host "✅ OTP Code verified successfully!" -ForegroundColor Green
    Write-Host "   Response: $($VerifyResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 3: Test Invalid Code
Write-Host "Test 3: Testing Invalid Code (should fail)..." -ForegroundColor Yellow
$InvalidBody = @{
    email = $Email
    code = "999999"
} | ConvertTo-Json

try {
    $InvalidResponse = Invoke-RestMethod -Uri "$BaseUrl/verify-custom-otp" `
        -Method Post `
        -Headers $Headers `
        -Body $InvalidBody
    
    Write-Host "⚠️  Unexpected success with invalid code!" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Invalid code correctly rejected" -ForegroundColor Green
    Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check your email inbox for the OTP code" -ForegroundColor Gray
Write-Host "2. Verify code is stored in verification_codes table" -ForegroundColor Gray
Write-Host "3. Check function logs in Supabase Dashboard" -ForegroundColor Gray
Write-Host ""




