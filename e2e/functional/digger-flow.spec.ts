import { test, expect } from '@playwright/test';
import { supabase, testUsers } from '../fixtures/visual-test-auth';

test.describe('Digger Registration & Profile Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as digger
    await page.goto('/register');
    await page.click('text=Already have an account?');
    await page.fill('input[type="email"]', testUsers.digger.email);
    await page.fill('input[type="password"]', testUsers.digger.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/role-dashboard/, { timeout: 10000 });
  });

  test('should complete digger role selection', async ({ page }) => {
    // Navigate to role dashboard
    await page.goto('/role-dashboard');
    
    // If no roles selected, should see role selection
    const hasDiggerRole = await page.locator('text=Digger').isVisible();
    
    if (!hasDiggerRole) {
      // Select Digger role
      await page.click('text=Become a Digger');
      await page.click('button:has-text("Continue")');
      
      // Should see digger registration form
      await expect(page.locator('text=Create your Dig')).toBeVisible();
    }
  });

  test('should create digger profile with required fields', async ({ page }) => {
    await page.goto('/digger-registration');
    
    // Fill required fields
    await page.fill('input[name="businessName"]', 'Test Construction LLC');
    await page.fill('input[name="phone"]', '+15551234567');
    await page.fill('input[name="location"]', 'San Francisco, CA');
    await page.fill('input[name="hourlyRate"]', '75');
    
    // Add profession
    await page.click('text=Add Profession');
    await page.fill('input[placeholder="e.g., Plumber, Electrician"]', 'Plumber');
    
    // Add bio
    await page.fill('textarea[name="bio"]', 'Experienced plumber with 10+ years of residential and commercial work.');
    
    // Submit
    await page.click('button:has-text("Create Profile")');
    
    // Should redirect to profile or dashboard
    await expect(page).toHaveURL(/\/(my-profiles|role-dashboard)/, { timeout: 10000 });
  });

  test('should add multiple professions to profile', async ({ page }) => {
    await page.goto('/my-profiles?mode=create');
    
    // Add first profession
    await page.click('text=Add Profession');
    await page.fill('input[placeholder="e.g., Plumber, Electrician"]', 'Electrician');
    
    // Add keywords to profession
    await page.click('text=Add Keywords');
    await page.fill('input[placeholder="Add keyword"]', 'Residential Wiring');
    await page.press('input[placeholder="Add keyword"]', 'Enter');
    
    // Add second profession
    await page.click('text=Add Another Profession');
    await page.fill('input[placeholder="e.g., Plumber, Electrician"]', 'HVAC Technician');
    
    // Save
    await page.click('button:has-text("Save Profile")');
    
    // Should show success message
    await expect(page.locator('text=/profile.*updated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should upload profile photo', async ({ page }) => {
    await page.goto('/my-profiles?mode=create');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('src/assets/hero-image.jpg');
    
    // Should show preview
    await expect(page.locator('img[alt*="Profile"]')).toBeVisible({ timeout: 5000 });
    
    // Save
    await page.click('button:has-text("Save Profile")');
    
    await expect(page.locator('text=/profile.*updated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should set pricing model and rates', async ({ page }) => {
    await page.goto('/my-profiles?mode=create');
    
    // Set pricing model
    await page.selectOption('select[name="pricingModel"]', 'hourly');
    
    // Set hourly rate
    await page.fill('input[name="hourlyRate"]', '85');
    
    // Or set rate range
    await page.click('text=Use Rate Range');
    await page.fill('input[name="hourlyRateMin"]', '75');
    await page.fill('input[name="hourlyRateMax"]', '95');
    
    await page.click('button:has-text("Save Profile")');
    
    await expect(page.locator('text=/profile.*updated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should add certifications and licenses', async ({ page }) => {
    await page.goto('/my-profiles?mode=create');
    
    // Mark as licensed
    await page.check('input[name="isLicensed"]');
    await page.check('input[name="isInsured"]');
    await page.check('input[name="isBonded"]');
    
    // Add certifications
    await page.click('text=Add Certification');
    await page.fill('input[placeholder="Certification name"]', 'Master Plumber License');
    
    await page.click('button:has-text("Save Profile")');
    
    await expect(page.locator('text=/profile.*updated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should view profile preview', async ({ page }) => {
    await page.goto('/my-profiles');
    
    // Should see created profile
    await expect(page.locator('text=Test Construction LLC')).toBeVisible();
    
    // Click to view details
    await page.click('text=View Profile');
    
    // Should show profile details
    await expect(page.locator('text=/hourly.*rate/i')).toBeVisible();
  });

  test('should browse available gigs', async ({ page }) => {
    await page.goto('/browse-gigs');
    
    // Should see gig listings
    await expect(page.locator('text=Available Gigs')).toBeVisible();
    
    // Apply filters
    await page.fill('input[placeholder*="location"]', 'San Francisco');
    await page.click('button:has-text("Apply Filters")');
    
    // Should see filtered results
    await page.waitForLoadState('networkidle');
  });

  test('should purchase a lead', async ({ page }) => {
    await page.goto('/browse-gigs');
    
    // Click on first gig
    await page.click('.gig-card:first-child');
    
    // Click purchase lead
    await page.click('button:has-text("Purchase Lead")');
    
    // Should show payment options
    await expect(page.locator('text=/non-exclusive|exclusive/i')).toBeVisible();
    
    // Select option and proceed
    await page.click('text=Non-Exclusive');
    await page.click('button:has-text("Proceed to Checkout")');
    
    // Should redirect to Stripe checkout or show confirmation
    await page.waitForLoadState('networkidle');
  });
});
