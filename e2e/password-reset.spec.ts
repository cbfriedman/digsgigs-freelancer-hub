import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Configure Supabase client for test
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Password Reset Flow', () => {
  const testEmail = `test-reset-${Date.now()}@example.com`;
  const originalPassword = 'TestPassword123!';
  const newPassword = 'NewPassword456!';
  let userId: string;

  test.beforeAll(async () => {
    // Create a test user
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: originalPassword,
      options: {
        data: {
          full_name: 'Test User',
          user_type: 'consumer',
        }
      }
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from signup');
    }

    userId = data.user.id;
    console.log(`Created test user: ${testEmail} (${userId})`);
  });

  test.afterAll(async () => {
    // Cleanup: Delete test user from auth and profiles
    // Note: This requires admin privileges in production
    try {
      await supabase.from('profiles').delete().eq('id', userId);
      console.log(`Cleaned up test user: ${userId}`);
    } catch (error) {
      console.warn('Could not cleanup test user:', error);
    }
  });

  test('should complete full password reset flow', async ({ page, context }) => {
    // Step 1: Navigate to auth page
    await page.goto('/auth');
    await expect(page).toHaveTitle(/DiggsAndGiggs/i);

    // Step 2: Click "Forgot password?" link
    await page.getByText('Forgot password?').click();
    
    // Step 3: Verify reset form is visible
    await expect(page.getByText('Reset Password')).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();

    // Step 4: Enter email and request reset
    await page.getByPlaceholder(/enter your email/i).fill(testEmail);
    await page.getByRole('button', { name: /send reset link/i }).click();

    // Step 5: Verify success message
    await expect(page.getByText(/password reset email sent/i)).toBeVisible({ timeout: 10000 });

    // Step 6: Simulate clicking the reset link
    // In a real scenario, you'd need to:
    // - Access the email inbox (using a service like MailHog, Mailtrap, or email API)
    // - Extract the reset link from the email
    // - Navigate to that link
    
    // For testing purposes, we'll manually trigger recovery mode
    // by navigating to the auth page with recovery token parameters
    
    // Generate a recovery session (this simulates clicking the email link)
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      testEmail,
      { redirectTo: `${page.url().split('/auth')[0]}/auth` }
    );

    if (resetError) {
      throw new Error(`Failed to send reset email: ${resetError.message}`);
    }

    console.log('Password reset email triggered');

    // Wait a moment for email processing
    await page.waitForTimeout(2000);

    // Step 7: Simulate the recovery link by creating a session with PASSWORD_RECOVERY event
    // Note: In a real test, you'd extract the actual recovery link from the email
    // For now, we'll manually set the auth state to recovery mode
    await page.evaluate(async () => {
      // Trigger recovery mode by adding the type=recovery parameter
      window.location.hash = '#type=recovery';
      window.location.reload();
    });

    await page.waitForLoadState('networkidle');

    // Step 8: Verify new password form is displayed
    await expect(page.getByText(/set new password/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/new password/i)).toBeVisible();
    await expect(page.getByPlaceholder(/confirm new password/i)).toBeVisible();

    // Step 9: Enter new password
    const newPasswordInput = page.getByPlaceholder(/^new password/i);
    const confirmPasswordInput = page.getByPlaceholder(/confirm new password/i);
    
    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    // Step 10: Submit new password
    await page.getByRole('button', { name: /update password/i }).click();

    // Step 11: Verify password was updated successfully
    await expect(page.getByText(/password updated/i)).toBeVisible({ timeout: 10000 });

    // Step 12: Verify redirect to home page (or intended destination)
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');

    // Step 13: Sign out (if signed in) and verify we can log in with new password
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 14: Navigate back to auth page
    await page.goto('/auth');

    // Step 15: Sign in with NEW password
    await page.getByPlaceholder(/email/i).first().fill(testEmail);
    await page.getByPlaceholder(/password/i).first().fill(newPassword);
    await page.getByRole('button', { name: /^sign in/i }).first().click();

    // Step 16: Verify successful login
    await expect(page.getByText(/signed in successfully/i)).toBeVisible({ timeout: 10000 });
    
    // Step 17: Verify redirect after successful login
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    // Navigate to auth page with recovery mode
    await page.goto('/auth#type=recovery');
    await page.waitForLoadState('networkidle');

    // Wait for new password form
    await expect(page.getByText(/set new password/i)).toBeVisible({ timeout: 10000 });

    // Enter mismatched passwords
    await page.getByPlaceholder(/^new password/i).fill('Password123!');
    await page.getByPlaceholder(/confirm new password/i).fill('DifferentPassword456!');

    // Submit
    await page.getByRole('button', { name: /update password/i }).click();

    // Verify error message
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    // Navigate to auth page with recovery mode
    await page.goto('/auth#type=recovery');
    await page.waitForLoadState('networkidle');

    // Wait for new password form
    await expect(page.getByText(/set new password/i)).toBeVisible({ timeout: 10000 });

    // Enter weak password
    const weakPassword = '123';
    await page.getByPlaceholder(/^new password/i).fill(weakPassword);
    await page.getByPlaceholder(/confirm new password/i).fill(weakPassword);

    // Submit
    await page.getByRole('button', { name: /update password/i }).click();

    // Verify error message about password length
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle expired reset link gracefully', async ({ page }) => {
    // Navigate to auth page with an error parameter (simulating expired link)
    await page.goto('/auth#error=access_denied&error_description=Token+has+expired');
    await page.waitForLoadState('networkidle');

    // Verify expired link message is shown
    await expect(page.getByText(/reset link expired/i)).toBeVisible({ timeout: 5000 });

    // Verify reset form is auto-opened
    await expect(page.getByText(/reset password/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
  });

  test('should prevent redirect during recovery mode', async ({ page }) => {
    // This test verifies the recoveryMode flag prevents premature redirects
    
    // First, sign in as the test user
    await page.goto('/auth');
    await page.getByPlaceholder(/email/i).first().fill(testEmail);
    await page.getByPlaceholder(/password/i).first().fill(originalPassword);
    await page.getByRole('button', { name: /^sign in/i }).first().click();
    
    // Wait for successful login
    await page.waitForURL('/', { timeout: 10000 });

    // Now navigate to recovery mode while already authenticated
    await page.goto('/auth#type=recovery');
    await page.waitForTimeout(2000);

    // Verify we stay on the auth page and see the new password form
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText(/set new password/i)).toBeVisible({ timeout: 5000 });

    // Verify we're NOT redirected to home page
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL('/');
  });
});
