import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Public Pages', () => {
  
  test.describe('Home Page', () => {
    test('should match homepage screenshot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
    });

    test('should match homepage hero section', async ({ page }) => {
      await page.goto('/');
      const hero = page.locator('section').first();
      await expect(hero).toHaveScreenshot('home-hero.png');
    });
  });

  test.describe('How It Works', () => {
    test('should match how-it-works page', async ({ page }) => {
      await page.goto('/how-it-works');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('how-it-works.png', { fullPage: true });
    });
  });

  test.describe('Pricing Page', () => {
    test('should match pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('pricing-page.png', { fullPage: true });
    });

    test('should match pricing category browser', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');
      const categoryBrowser = page.locator('text=Browse Categories').first();
      await expect(categoryBrowser).toHaveScreenshot('pricing-category-browser.png');
    });
  });

  test.describe('FAQ Page', () => {
    test('should match FAQ page', async ({ page }) => {
      await page.goto('/faq');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('faq-page.png', { fullPage: true });
    });
  });

  test.describe('Contact Page', () => {
    test('should match contact page', async ({ page }) => {
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('contact-page.png', { fullPage: true });
    });
  });

  test.describe('Blog Page', () => {
    test('should match blog listing page', async ({ page }) => {
      await page.goto('/blog');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('blog-page.png', { fullPage: true });
    });
  });

  test.describe('Legal Pages', () => {
    test('should match terms of service page', async ({ page }) => {
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('terms-page.png', { fullPage: true });
    });

    test('should match privacy policy page', async ({ page }) => {
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('privacy-page.png', { fullPage: true });
    });
  });

  test.describe('Digger Guide', () => {
    test('should match digger guide page', async ({ page }) => {
      await page.goto('/digger-guide');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('digger-guide.png', { fullPage: true });
    });
  });

  test.describe('404 Not Found', () => {
    test('should match 404 page', async ({ page }) => {
      await page.goto('/non-existent-page');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('404-page.png');
    });
  });
});
