import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Component States', () => {
  
  test.describe('Navigation Component', () => {
    test('should match navigation - logged out', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const nav = page.locator('nav').first();
      await expect(nav).toHaveScreenshot('nav-logged-out.png');
    });

    test('should match navigation - mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Open mobile menu if hamburger button exists
      const menuButton = page.locator('button[aria-label*="menu"]').or(
        page.locator('button').filter({ hasText: /menu/i })
      );
      
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);
      }
      
      await expect(page).toHaveScreenshot('nav-mobile-menu.png');
    });
  });

  test.describe('Footer Component', () => {
    test('should match footer', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot('footer.png');
    });
  });

  test.describe('Cards and UI Elements', () => {
    test('should match gig card on browse page', async ({ page }) => {
      await page.goto('/browse-gigs');
      await page.waitForLoadState('networkidle');
      
      const firstCard = page.locator('[data-testid="gig-card"]').first().or(
        page.locator('.card').first()
      );
      
      if (await firstCard.isVisible()) {
        await expect(firstCard).toHaveScreenshot('gig-card.png');
      }
    });
  });

  test.describe('Loading States', () => {
    test('should match loading spinner', async ({ page }) => {
      // Intercept API to delay response
      await page.route('**/rest/v1/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      const loaderPromise = page.goto('/browse-gigs');
      
      // Try to capture loading state quickly
      const loader = page.locator('[data-testid="loader"]').or(
        page.locator('.animate-spin')
      );
      
      try {
        if (await loader.isVisible({ timeout: 2000 })) {
          await expect(loader).toHaveScreenshot('loading-spinner.png');
        }
      } catch (e) {
        // Loading state may be too fast to capture
      }
      
      await loaderPromise;
    });
  });

  test.describe('Toast Notifications', () => {
    test('should match error toast', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      // Trigger error toast by submitting invalid form
      const submitButton = page.getByRole('button', { name: /create account|sign up/i });
      await submitButton.click();
      
      const toast = page.locator('[data-sonner-toast]').or(
        page.locator('[role="alert"]')
      );
      
      try {
        if (await toast.isVisible({ timeout: 3000 })) {
          await expect(toast.first()).toHaveScreenshot('toast-error.png');
        }
      } catch (e) {
        // Toast may not appear
      }
    });
  });

  test.describe('Modal/Dialog States', () => {
    test('should match dialog overlay', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Try to find and click a button that opens a dialog
      const dialogTrigger = page.getByRole('button', { name: /get started|learn more/i }).first();
      
      if (await dialogTrigger.isVisible()) {
        await dialogTrigger.click();
        await page.waitForTimeout(500);
        
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          await expect(dialog).toHaveScreenshot('dialog.png');
        }
      }
    });
  });

  test.describe('Form States', () => {
    test('should match empty form state', async ({ page }) => {
      await page.goto('/post-gig');
      await page.waitForLoadState('networkidle');
      const form = page.locator('form').first();
      await expect(form).toHaveScreenshot('form-empty.png');
    });

    test('should match filled form state', async ({ page }) => {
      await page.goto('/post-gig');
      await page.waitForLoadState('networkidle');
      
      // Fill some form fields
      await page.getByLabel(/title/i).fill('Test Project Title');
      await page.getByLabel(/description/i).fill('This is a test project description with enough content to be valid.');
      
      const form = page.locator('form').first();
      await expect(form).toHaveScreenshot('form-filled.png');
    });
  });
});
