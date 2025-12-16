# Deploy all OpenAI-migrated functions to Supabase
# Run this script from the project root directory

Write-Host "Deploying all OpenAI functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

$functions = @(
    "enhance-gig-description",
    "auto-categorize-gig",
    "chat-bot",
    "generate-profile-suggestions",
    "suggest-keywords-from-description",
    "match-diggers-semantic",
    "match-industry-codes",
    "generate-step-image",
    "generate-blog-post",
    "generate-bio",
    "verify-lead-match"
)

$successCount = 0
$failCount = 0
$failedFunctions = @()

foreach ($function in $functions) {
    Write-Host "Deploying $function..." -ForegroundColor Yellow
    
    try {
        $result = supabase functions deploy $function 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] $function deployed successfully!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "[FAILED] $function deployment failed!" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            $failCount++
            $failedFunctions += $function
        }
    } catch {
        Write-Host "[ERROR] Error deploying $function : $_" -ForegroundColor Red
        $failCount++
        $failedFunctions += $function
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

if ($failedFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed functions:" -ForegroundColor Red
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Try deploying failed functions individually:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "   supabase functions deploy $func" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "All functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Don't forget to:" -ForegroundColor Yellow
    Write-Host "   1. Add OPENAI_API_KEY to Supabase Secrets" -ForegroundColor Yellow
    Write-Host "   2. Test the AI features on your site" -ForegroundColor Yellow
}
