# E2E Tests with Playwright

This directory contains end-to-end tests for the application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

Run all tests:
```bash
npx playwright test
```

Run tests in headed mode (see browser):
```bash
npx playwright test --headed
```

Run specific test file:
```bash
npx playwright test e2e/password-reset.spec.ts
```

Run tests in UI mode (interactive):
```bash
npx playwright test --ui
```

## Test Structure

### Password Reset Flow (`password-reset.spec.ts`)

Tests the complete password reset journey:
1. User requests password reset email
2. User clicks reset link from email
3. User enters new password
4. User is redirected to home page
5. User can sign in with new password

Also includes tests for:
- Mismatched password validation
- Weak password validation
- Expired link handling
- Recovery mode redirect prevention

## Configuration

Test configuration is in `playwright.config.ts` in the root directory.

Key settings:
- Base URL: `http://localhost:8080` (configurable via `VITE_BASE_URL`)
- Browsers: Chromium, Firefox, WebKit
- Retries: 2 in CI, 0 locally
- Screenshots: On failure only
- Trace: On first retry

## Environment Variables

Required environment variables (from `.env`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

## CI/CD Integration

Tests can be run in CI by:
```bash
CI=true npx playwright test
```

This enables:
- Stricter validation (fails on `.only`)
- More retries for flaky tests
- Headless browser mode

## Viewing Test Reports

After running tests:
```bash
npx playwright show-report
```

## Debugging Tests

Run with debug mode:
```bash
npx playwright test --debug
```

Or use VS Code Playwright extension for step-by-step debugging.

## Best Practices

1. **Cleanup**: Always clean up test data in `afterAll` hooks
2. **Unique identifiers**: Use timestamps in test emails/data to avoid conflicts
3. **Wait strategies**: Use `waitForLoadState` and `waitForURL` for reliable tests
4. **Selectors**: Prefer semantic selectors (role, text) over CSS/XPath
5. **Assertions**: Use Playwright's built-in assertions with proper timeouts

## Troubleshooting

### Tests timeout
- Increase timeout in test config
- Check if dev server is running
- Verify network connectivity

### Flaky tests
- Add explicit waits for async operations
- Use `waitForLoadState('networkidle')`
- Increase retries in config

### Email testing
For complete email flow testing, consider integrating:
- [MailHog](https://github.com/mailhog/MailHog) for local email capture
- [Mailtrap](https://mailtrap.io/) for staging environments
- Email service APIs for production testing
