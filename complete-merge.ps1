# Script to complete git merge after types.ts file is closed
Write-Host "Completing git merge..." -ForegroundColor Green

# Remove conflicting untracked files
Write-Host "Removing conflicting files..." -ForegroundColor Yellow
Remove-Item -Recurse -Force supabase/functions/charge-gigger-deposit -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase/functions/handle-deposit-webhook -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase/functions/process-expired-awards-cron -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase/functions/process-expired-awards -ErrorAction SilentlyContinue
Remove-Item -Force supabase/migrations/20260116175638_6298136a-f3a0-4804-b42f-f8e8a7ab10ed.sql -ErrorAction SilentlyContinue
Remove-Item -Force supabase/migrations/20260116180529_c415f737-ef39-4b6b-9d47-d41f5c07b622.sql -ErrorAction SilentlyContinue

# Complete the merge
Write-Host "Merging with origin/main..." -ForegroundColor Yellow
git merge origin/main --no-edit

if ($LASTEXITCODE -eq 0) {
    Write-Host "Merge completed successfully!" -ForegroundColor Green
    Write-Host "Regenerating TypeScript types..." -ForegroundColor Yellow
    npm run gen:types
    Write-Host "Done! You can now apply your stashed changes with: git stash pop" -ForegroundColor Green
} else {
    Write-Host "Merge failed. Please ensure types.ts file is closed in your editor." -ForegroundColor Red
}
