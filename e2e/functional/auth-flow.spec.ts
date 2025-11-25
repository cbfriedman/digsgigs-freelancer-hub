import { test, expect } from '@playwright/test';
import { supabase } from '../fixtures/visual-test-auth';

test.describe('Authentication Flow', () => {
  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testPhone = `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

  test.afterAll(async () => {
    // Cleanup test users
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUsers = users?.users.filter(u => 
      u.email?.includes('test-auth-') || u.phone?.includes('+1555')
    );
    
    for (const user of testUsers || []) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  test('should complete email signup flow', async ({ page }) => {
    await page.goto('/register');
    
    // Fill in basic information
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Select email verification
    await page.click('text=Email');
    
    // Submit form
    await page.click('button:has-text("Continue")');
    
    // Should show verification step
    await expect(page.locator('text=Verify Your Account')).toBeVisible({ timeout: 10000 });
    
    // In real testing, would need to retrieve OTP from email
    // For now, verify the UI is correct
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('should complete phone signup flow', async ({ page }) => {
    await page.goto('/register');
    
    // Fill in basic information
    await page.fill('input[name="fullName"]', 'Test Phone User');
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Select SMS verification
    await page.click('text=SMS');
    
    // Submit form
    await page.click('button:has-text("Continue")');
    
    // Should show verification step
    await expect(page.locator('text=Verify Your Account')).toBeVisible({ timeout: 10000 });
  });

  test('should complete login flow', async ({ page }) => {
    // First create account via API
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { full_name: 'Test Login User' }
      }
    });
    
    expect(error).toBeNull();
    
    await page.goto('/register');
    
    // Switch to sign in
    await page.click('text=Already have an account?');
    
    // Fill in credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/role-dashboard/, { timeout: 10000 });
  });

  test('should complete password reset flow', async ({ page }) => {
    await page.goto('/register');
    
    // Switch to sign in
    await page.click('text=Already have an account?');
    
    // Click forgot password
    await page.click('text=Forgot Password?');
    
    // Enter email
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 5000 });
  });

  test('should enforce password requirements', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', `test-weak-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    await page.click('button:has-text("Continue")');
    
    // Should show validation error
    await expect(page.locator('text=/password.*must.*8 characters/i')).toBeVisible();
  });

  test('should enforce password confirmation match', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', `test-mismatch-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    
    await page.click('button:has-text("Continue")');
    
    // Should show mismatch error
    await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
  });

  test('should show error for invalid credentials on login', async ({ page }) => {
    await page.goto('/register');
    
    // Switch to sign in
    await page.click('text=Already have an account?');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // Should show error
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 5000 });
  });

  test('should sign out successfully', async ({ page }) => {
    // Login first
    await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { full_name: 'Test Signout User' }
      }
    });
    
    await page.goto('/register');
    await page.click('text=Already have an account?');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign In")');
    
    await expect(page).toHaveURL(/\/role-dashboard/, { timeout: 10000 });
    
    // Click sign out
    await page.click('[aria-label="Sign out"]');
    
    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});
