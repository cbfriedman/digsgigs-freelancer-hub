import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Auth Pages', () => {
  
  test.describe('Registration Page', () => {
    test('should match registration page - sign up mode', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('register-signup.png', { fullPage: true });
    });

    test('should match registration page - sign in mode', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      // Click to switch to sign in mode
      const signInButton = page.getByText(/sign in/i).first();
      if (await signInButton.isVisible()) {
        await signInButton.click();
        await page.waitForTimeout(500); // Wait for transition
      }
      
      await expect(page).toHaveScreenshot('register-signin.png', { fullPage: true });
    });

    test('should match password strength indicator', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      // Fill password to trigger strength indicator
      const passwordInput = page.getByPlaceholder(/password/i).first();
      await passwordInput.fill('weak');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('register-password-weak.png');
      
      await passwordInput.fill('StrongPassword123!');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('register-password-strong.png');
    });

    test('should match validation error states', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      // Submit empty form to trigger validation
      const submitButton = page.getByRole('button', { name: /create account|sign up/i });
      await submitButton.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('register-validation-errors.png', { fullPage: true });
    });
  });

  test.describe('Demo Registration Pages', () => {
    test('should match profile creation demo', async ({ page }) => {
      await page.goto('/profile-demo');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('demo-profile-creation.png', { fullPage: true });
    });

    test('should match digger registration demo', async ({ page }) => {
      await page.goto('/demo/digger-registration');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('demo-digger-registration.png', { fullPage: true });
    });

    test('should match gig registration demo', async ({ page }) => {
      await page.goto('/demo/gig-registration');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('demo-gig-registration.png', { fullPage: true });
    });

    test('should match pre-demo registration', async ({ page }) => {
      await page.goto('/pre-demo');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('pre-demo-registration.png', { fullPage: true });
    });
  });
});
