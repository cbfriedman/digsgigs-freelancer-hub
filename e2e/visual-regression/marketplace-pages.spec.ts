import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Marketplace Pages', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const signInLink = page.getByText(/sign in/i).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await page.waitForTimeout(300);
    }
    
    await page.getByPlaceholder(/email/i).first().fill('test-visual@example.com');
    await page.getByPlaceholder(/password/i).first().fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/role-dashboard|\//, { timeout: 10000 }).catch(() => {});
  });

  test.describe('Browse Gigs', () => {
    test('should match browse gigs - list view', async ({ page }) => {
      await page.goto('/browse-gigs');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('browse-gigs-list.png', { fullPage: true });
    });

    test('should match browse gigs - with filters open', async ({ page }) => {
      await page.goto('/browse-gigs');
      await page.waitForLoadState('networkidle');
      
      // Open advanced filters if available
      const filtersButton = page.getByRole('button', { name: /filter|advanced/i });
      if (await filtersButton.isVisible()) {
        await filtersButton.click();
        await page.waitForTimeout(500);
      }
      
      await expect(page).toHaveScreenshot('browse-gigs-filters.png', { fullPage: true });
    });
  });

  test.describe('Browse Diggers', () => {
    test('should match browse diggers page', async ({ page }) => {
      await page.goto('/browse-diggers');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('browse-diggers.png', { fullPage: true });
    });
  });

  test.describe('Post Gig', () => {
    test('should match post gig form', async ({ page }) => {
      await page.goto('/post-gig');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('post-gig.png', { fullPage: true });
    });
  });

  test.describe('Checkout', () => {
    test('should match checkout page', async ({ page }) => {
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('checkout.png', { fullPage: true });
    });
  });

  test.describe('Subscription', () => {
    test('should match subscription page', async ({ page }) => {
      await page.goto('/subscription');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('subscription.png', { fullPage: true });
    });
  });

  test.describe('Escrow Dashboard', () => {
    test('should match escrow dashboard', async ({ page }) => {
      await page.goto('/escrow-dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('escrow-dashboard.png', { fullPage: true });
    });
  });

  test.describe('Digger Subscription', () => {
    test('should match digger subscription page', async ({ page }) => {
      await page.goto('/digger-subscription');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('digger-subscription.png', { fullPage: true });
    });
  });
});
