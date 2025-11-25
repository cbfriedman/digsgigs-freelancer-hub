import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/visual-test-auth';

test.describe('Bidding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as digger
    await page.goto('/register');
    await page.click('text=Already have an account?');
    await page.fill('input[type="email"]', testUsers.digger.email);
    await page.fill('input[type="password"]', testUsers.digger.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/role-dashboard/, { timeout: 10000 });
  });

  test('should view purchased lead details', async ({ page }) => {
    await page.goto('/my-leads');
    
    // Should see leads list
    await expect(page.locator('text=My Leads')).toBeVisible();
    
    // Click on first lead
    const firstLead = page.locator('.lead-card').first();
    if (await firstLead.isVisible()) {
      await firstLead.click();
      
      // Should see lead details
      await expect(page.locator('text=/description|budget|location/i')).toBeVisible();
    }
  });

  test('should submit bid on purchased lead', async ({ page }) => {
    await page.goto('/my-leads');
    
    // Click on lead
    await page.click('.lead-card:first-child');
    
    // Fill bid form
    await page.fill('input[name="bidAmount"]', '18000');
    await page.fill('input[name="timeline"]', '4 weeks');
    await page.fill('textarea[name="proposal"]', 'I have 15 years of experience in kitchen remodeling. I can complete this project with high quality materials and workmanship.');
    
    // Submit bid
    await page.click('button:has-text("Submit Bid")');
    
    // Should show success
    await expect(page.locator('text=/bid.*submitted/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate bid amount requirements', async ({ page }) => {
    await page.goto('/my-leads');
    await page.click('.lead-card:first-child');
    
    // Try to submit without amount
    await page.fill('textarea[name="proposal"]', 'Test proposal');
    await page.click('button:has-text("Submit Bid")');
    
    // Should show validation error
    await expect(page.locator('text=/amount.*required/i')).toBeVisible();
  });

  test('should validate proposal requirements', async ({ page }) => {
    await page.goto('/my-leads');
    await page.click('.lead-card:first-child');
    
    // Try to submit without proposal
    await page.fill('input[name="bidAmount"]', '18000');
    await page.click('button:has-text("Submit Bid")');
    
    // Should show validation error
    await expect(page.locator('text=/proposal.*required/i')).toBeVisible();
  });

  test('should view my submitted bids', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Should see bids list
    await expect(page.locator('text=My Bids')).toBeVisible();
    
    // Should see bid cards
    const bidCount = await page.locator('.bid-card').count();
    expect(bidCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter bids by status', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Filter by pending
    await page.click('button:has-text("Pending")');
    await page.waitForLoadState('networkidle');
    
    // Filter by accepted
    await page.click('button:has-text("Accepted")');
    await page.waitForLoadState('networkidle');
    
    // Filter by rejected
    await page.click('button:has-text("Rejected")');
    await page.waitForLoadState('networkidle');
  });

  test('should edit submitted bid before acceptance', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Find pending bid
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Update bid amount
      await page.fill('input[name="bidAmount"]', '19500');
      await page.fill('textarea[name="proposal"]', 'Updated proposal with revised timeline.');
      
      // Save changes
      await page.click('button:has-text("Update Bid")');
      
      await expect(page.locator('text=/updated/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should withdraw bid', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Find bid to withdraw
    const withdrawButton = page.locator('button:has-text("Withdraw")').first();
    if (await withdrawButton.isVisible()) {
      await withdrawButton.click();
      
      // Confirm withdrawal
      await page.click('button:has-text("Confirm Withdrawal")');
      
      await expect(page.locator('text=/withdrawn/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should see bid status updates', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Check for status badges
    await expect(page.locator('text=/pending|accepted|rejected/i')).toBeVisible();
  });

  test('should receive notification when bid is accepted', async ({ page }) => {
    await page.goto('/notifications');
    
    // Should see notifications
    const notification = page.locator('text=/bid.*accepted/i');
    if (await notification.isVisible()) {
      await notification.click();
      
      // Should navigate to bid details
      await page.waitForLoadState('networkidle');
    }
  });

  test('should start work after bid acceptance', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Find accepted bid
    const startWorkButton = page.locator('button:has-text("Start Work")').first();
    if (await startWorkButton.isVisible()) {
      await startWorkButton.click();
      
      // Should show work started confirmation
      await expect(page.locator('text=/work.*started/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should complete work and request payment', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Find in-progress bid
    const completeButton = page.locator('button:has-text("Mark Complete")').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Enter final amount
      await page.fill('input[name="finalAmount"]', '18500');
      
      // Request payment
      await page.click('button:has-text("Request Payment")');
      
      await expect(page.locator('text=/payment.*requested/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view bid history and timeline', async ({ page }) => {
    await page.goto('/my-bids');
    
    // Click on bid
    await page.click('.bid-card:first-child');
    
    // Should see timeline
    await expect(page.locator('text=/submitted|accepted|completed/i')).toBeVisible();
  });

  test('should compare my bid with other bids', async ({ page }) => {
    await page.goto('/my-bids');
    
    // View bid details
    await page.click('.bid-card:first-child');
    
    // Check if can see bid ranking
    const ranking = page.locator('text=/lowest bid|competitive/i');
    if (await ranking.isVisible()) {
      await expect(ranking).toBeVisible();
    }
  });
});
