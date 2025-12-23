import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://njpjxasfesdapxukvyth.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qcGp4YXNmZXNkYXB4dWt2eXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzY4MjMsImV4cCI6MjA4MDExMjgyM30.TgM7vZ-MhYzN2Bn4wyQJZDUolXbOuB6XH40hEJm8Z0I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user credentials
export const testUsers = {
  digger: {
    email: 'visual-test-digger@example.com',
    password: 'VisualTest123!',
    fullName: 'Visual Test Digger',
  },
  gigger: {
    email: 'visual-test-gigger@example.com',
    password: 'VisualTest123!',
    fullName: 'Visual Test Gigger',
  },
  admin: {
    email: 'visual-test-admin@example.com',
    password: 'VisualTest123!',
    fullName: 'Visual Test Admin',
  },
};

// Extended test fixture with authentication
export const test = base.extend<{
  authenticatedPage: typeof base['page'];
  authenticatedDiggerPage: typeof base['page'];
  authenticatedGiggerPage: typeof base['page'];
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const signInLink = page.getByText(/sign in/i).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await page.waitForTimeout(300);
    }
    
    await page.getByPlaceholder(/email/i).first().fill(testUsers.digger.email);
    await page.getByPlaceholder(/password/i).first().fill(testUsers.digger.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/role-dashboard|\//, { timeout: 10000 }).catch(() => {});
    
    await use(page);
  },
  
  authenticatedDiggerPage: async ({ page }, use) => {
    // Login as digger
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const signInLink = page.getByText(/sign in/i).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await page.waitForTimeout(300);
    }
    
    await page.getByPlaceholder(/email/i).first().fill(testUsers.digger.email);
    await page.getByPlaceholder(/password/i).first().fill(testUsers.digger.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/role-dashboard|\//, { timeout: 10000 }).catch(() => {});
    
    await use(page);
  },
  
  authenticatedGiggerPage: async ({ page }, use) => {
    // Login as gigger
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const signInLink = page.getByText(/sign in/i).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await page.waitForTimeout(300);
    }
    
    await page.getByPlaceholder(/email/i).first().fill(testUsers.gigger.email);
    await page.getByPlaceholder(/password/i).first().fill(testUsers.gigger.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/role-dashboard|\//, { timeout: 10000 }).catch(() => {});
    
    await use(page);
  },
});

export { expect };
