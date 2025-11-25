import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Dashboard Pages', () => {
  
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

  test.describe('Role Dashboard', () => {
    test('should match role dashboard', async ({ page }) => {
      await page.goto('/role-dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('role-dashboard.png', { fullPage: true });
    });
  });

  test.describe('My Gigs', () => {
    test('should match my gigs page', async ({ page }) => {
      await page.goto('/my-gigs');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('my-gigs.png', { fullPage: true });
    });
  });

  test.describe('My Leads', () => {
    test('should match my leads page', async ({ page }) => {
      await page.goto('/my-leads');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('my-leads.png', { fullPage: true });
    });
  });

  test.describe('My Bids', () => {
    test('should match my bids page', async ({ page }) => {
      await page.goto('/my-bids');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('my-bids.png', { fullPage: true });
    });
  });

  test.describe('My Profiles', () => {
    test('should match my profiles page', async ({ page }) => {
      await page.goto('/my-profiles');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('my-profiles.png', { fullPage: true });
    });
  });

  test.describe('Messages', () => {
    test('should match messages page', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('messages.png', { fullPage: true });
    });
  });

  test.describe('Notifications', () => {
    test('should match notifications page', async ({ page }) => {
      await page.goto('/notifications');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('notifications.png', { fullPage: true });
    });
  });

  test.describe('Transactions', () => {
    test('should match transactions page', async ({ page }) => {
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('transactions.png', { fullPage: true });
    });
  });

  test.describe('Saved Searches', () => {
    test('should match saved searches page', async ({ page }) => {
      await page.goto('/saved-searches');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('saved-searches.png', { fullPage: true });
    });
  });

  test.describe('Email Preferences', () => {
    test('should match email preferences page', async ({ page }) => {
      await page.goto('/email-preferences');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('email-preferences.png', { fullPage: true });
    });
  });
});
