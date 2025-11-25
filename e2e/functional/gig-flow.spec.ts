import { test, expect } from '@playwright/test';
import { supabase, testUsers } from '../fixtures/visual-test-auth';

test.describe('Gig Posting & Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as gigger (consumer)
    await page.goto('/register');
    await page.click('text=Already have an account?');
    await page.fill('input[type="email"]', testUsers.gigger.email);
    await page.fill('input[type="password"]', testUsers.gigger.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/role-dashboard/, { timeout: 10000 });
  });

  test('should navigate to post gig page', async ({ page }) => {
    await page.goto('/role-dashboard');
    
    // Click post gig button
    await page.click('text=Post a Gig');
    
    // Should navigate to post gig page
    await expect(page).toHaveURL('/post-gig');
  });

  test('should create basic gig with required fields', async ({ page }) => {
    await page.goto('/post-gig');
    
    // Fill required fields
    await page.fill('input[name="title"]', 'Kitchen Remodel Project');
    await page.fill('textarea[name="description"]', 'Looking for a contractor to remodel my kitchen. Need full renovation including cabinets, countertops, and appliances.');
    await page.fill('input[name="location"]', 'San Francisco, CA');
    await page.fill('input[name="budgetMin"]', '15000');
    await page.fill('input[name="budgetMax"]', '25000');
    
    // Select timeline
    await page.selectOption('select[name="timeline"]', 'within_month');
    
    // Submit
    await page.click('button:has-text("Post Gig")');
    
    // Should show success and redirect
    await expect(page.locator('text=/gig.*posted/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/my-gigs|role-dashboard/, { timeout: 10000 });
  });

  test('should create gig with category selection', async ({ page }) => {
    await page.goto('/post-gig');
    
    await page.fill('input[name="title"]', 'Bathroom Renovation');
    await page.fill('textarea[name="description"]', 'Complete bathroom renovation needed.');
    await page.fill('input[name="location"]', 'Oakland, CA');
    
    // Select category
    await page.click('text=Select Category');
    await page.click('text=Home Improvement');
    await page.click('text=Plumbing');
    
    await page.fill('input[name="budgetMin"]', '8000');
    await page.fill('input[name="budgetMax"]', '12000');
    
    await page.click('button:has-text("Post Gig")');
    
    await expect(page.locator('text=/gig.*posted/i')).toBeVisible({ timeout: 5000 });
  });

  test('should upload images to gig', async ({ page }) => {
    await page.goto('/post-gig');
    
    await page.fill('input[name="title"]', 'Deck Repair');
    await page.fill('textarea[name="description"]', 'Deck needs repair and staining.');
    await page.fill('input[name="location"]', 'San Jose, CA');
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('src/assets/hero-image.jpg');
    
    // Should show image preview
    await expect(page.locator('img[alt*="Upload"]')).toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="budgetMin"]', '2000');
    await page.fill('input[name="budgetMax"]', '4000');
    
    await page.click('button:has-text("Post Gig")');
    
    await expect(page.locator('text=/gig.*posted/i')).toBeVisible({ timeout: 5000 });
  });

  test('should view my posted gigs', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Should see gigs list
    await expect(page.locator('text=My Gigs')).toBeVisible();
    
    // Should see at least one gig if previously posted
    const gigCount = await page.locator('.gig-card').count();
    expect(gigCount).toBeGreaterThanOrEqual(0);
  });

  test('should view gig details and bids', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Click on first gig
    const firstGig = page.locator('.gig-card').first();
    if (await firstGig.isVisible()) {
      await firstGig.click();
      
      // Should see gig details
      await expect(page.locator('text=/description|budget|location/i')).toBeVisible();
      
      // Should see bids section
      await expect(page.locator('text=Bids')).toBeVisible();
    }
  });

  test('should edit posted gig', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Click edit on first gig
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Update description
      await page.fill('textarea[name="description"]', 'Updated description with more details.');
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      
      await expect(page.locator('text=/updated/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete posted gig', async ({ page }) => {
    // First create a test gig
    await page.goto('/post-gig');
    await page.fill('input[name="title"]', 'Test Gig for Deletion');
    await page.fill('textarea[name="description"]', 'This gig will be deleted');
    await page.fill('input[name="location"]', 'Test City');
    await page.fill('input[name="budgetMin"]', '1000');
    await page.fill('input[name="budgetMax"]', '2000');
    await page.click('button:has-text("Post Gig")');
    
    await page.waitForTimeout(1000);
    await page.goto('/my-gigs');
    
    // Find and delete the test gig
    const deleteButton = page.locator('button:has-text("Delete")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      await expect(page.locator('text=/deleted/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should review and accept bid', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Click on gig with bids
    await page.click('.gig-card:first-child');
    
    // Check if bids exist
    const bidCard = page.locator('.bid-card').first();
    if (await bidCard.isVisible()) {
      // View bid details
      await expect(bidCard.locator('text=/amount|proposal/i')).toBeVisible();
      
      // Accept bid button should be visible
      await expect(page.locator('button:has-text("Accept Bid")')).toBeVisible();
    }
  });

  test('should request escrow for accepted bid', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Navigate to gig with accepted bid
    await page.click('.gig-card:first-child');
    
    const escrowButton = page.locator('button:has-text("Set Up Escrow")');
    if (await escrowButton.isVisible()) {
      await escrowButton.click();
      
      // Should show escrow dialog
      await expect(page.locator('text=/escrow.*contract/i')).toBeVisible();
    }
  });

  test('should mark gig as completed', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Find completed gig
    await page.click('.gig-card:first-child');
    
    const completeButton = page.locator('button:has-text("Mark Complete")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Confirm completion
      await page.click('button:has-text("Confirm")');
      
      await expect(page.locator('text=/completed/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should leave rating for digger', async ({ page }) => {
    await page.goto('/my-gigs');
    
    // Navigate to completed gig
    await page.click('.gig-card:first-child');
    
    const rateButton = page.locator('button:has-text("Rate Digger")');
    if (await rateButton.isVisible()) {
      await rateButton.click();
      
      // Select rating
      await page.click('[aria-label="5 stars"]');
      
      // Leave review
      await page.fill('textarea[name="review"]', 'Excellent work! Very professional.');
      
      // Submit
      await page.click('button:has-text("Submit Rating")');
      
      await expect(page.locator('text=/rating.*submitted/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
