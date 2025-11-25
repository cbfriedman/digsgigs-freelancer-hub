# Visual Regression Testing Guide

## Overview
This project uses Playwright for visual regression testing, comparing screenshots against baseline images to detect unintended visual changes across multiple browsers and viewports.

## Installation

Ensure Playwright is installed with all browsers:

```bash
npm install
npx playwright install
```

## Running Tests

### Run all visual regression tests
```bash
npm run test:visual
```

### Run specific test suites
```bash
# Public pages only
npx playwright test e2e/visual-regression/public-pages.spec.ts

# Auth pages only
npx playwright test e2e/visual-regression/auth-pages.spec.ts

# Dashboard pages only
npx playwright test e2e/visual-regression/dashboard-pages.spec.ts

# Marketplace pages only
npx playwright test e2e/visual-regression/marketplace-pages.spec.ts

# Component states only
npx playwright test e2e/visual-regression/components.spec.ts
```

### Run on specific browser/device
```bash
# Desktop Chrome only
npx playwright test e2e/visual-regression/ --project=chromium

# Mobile Safari only
npx playwright test e2e/visual-regression/ --project=mobile-safari

# All mobile devices
npx playwright test e2e/visual-regression/ --project=mobile-chrome --project=mobile-safari
```

### Update baseline screenshots
When UI changes are intentional and you want to accept them as the new baseline:

```bash
npm run test:visual:update
```

Or update specific browser baselines:
```bash
npx playwright test e2e/visual-regression/ --project=chromium --update-snapshots
```

### View test report
After running tests, view the detailed HTML report:

```bash
npm run test:visual:report
```

## Test Structure

### Directory Layout
```
e2e/
├── visual-regression/
│   ├── public-pages.spec.ts       # Public pages (no auth required)
│   ├── auth-pages.spec.ts         # Registration/login pages
│   ├── dashboard-pages.spec.ts    # User dashboard pages (requires auth)
│   ├── marketplace-pages.spec.ts  # Browse/detail pages (requires auth)
│   └── components.spec.ts         # UI component states
├── fixtures/
│   └── visual-test-auth.ts        # Auth helpers for authenticated tests
└── snapshots/                     # Auto-generated baseline images
    ├── chromium/
    ├── firefox/
    ├── webkit/
    ├── mobile-chrome/
    ├── mobile-safari/
    └── tablet/
```

### Test Coverage

| Test Suite | Pages Tested | Auth Required |
|------------|--------------|---------------|
| `public-pages.spec.ts` | Home, Pricing, FAQ, Contact, Blog, Terms, Privacy, Digger Guide, 404 | No |
| `auth-pages.spec.ts` | Register (sign up/in), Password strength, Demo pages | No |
| `dashboard-pages.spec.ts` | Role Dashboard, My Gigs, My Leads, My Bids, Messages, Notifications, Transactions, Saved Searches, Email Preferences | Yes |
| `marketplace-pages.spec.ts` | Browse Gigs, Browse Diggers, Post Gig, Checkout, Subscription, Escrow | Yes |
| `components.spec.ts` | Navigation, Footer, Cards, Loading states, Toasts, Dialogs, Forms | Varies |

### Browser/Device Coverage
- **Desktop Browsers**: Chrome, Firefox, Safari (WebKit)
- **Mobile Devices**: Pixel 5 (Chrome), iPhone 12 (Safari)
- **Tablet**: iPad (gen 7)

## Handling Test Failures

### Expected Changes (Intentional UI Updates)
When you've made intentional changes to the UI:

1. **Review the differences**:
   ```bash
   npm run test:visual:report
   ```
   - Open the HTML report and examine the side-by-side comparison
   - Verify changes match your intentions

2. **Update baselines**:
   ```bash
   npm run test:visual:update
   ```

3. **Commit updated snapshots**:
   ```bash
   git add e2e/snapshots/
   git commit -m "Update visual regression baselines for [feature]"
   ```

### Unexpected Changes (Regressions)
When tests fail unexpectedly:

1. **Review the diff**:
   - Open the HTML report
   - Check the "Expected vs Actual" comparison
   - Identify what changed

2. **Common causes**:
   - Dynamic content (dates, random data)
   - Animation timing issues
   - Font rendering differences
   - Network-dependent content

3. **Fix the regression**:
   - Update CSS/components to match expected behavior
   - Fix broken functionality
   - Re-run tests to confirm fix

4. **If intentional**:
   - Follow "Expected Changes" process above

## Configuration

### Screenshot Comparison Settings
Located in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,           // Allow up to 100 pixels difference
    maxDiffPixelRatio: 0.01,      // 1% pixel difference tolerance
    threshold: 0.2,               // 20% color comparison threshold
    animations: 'disabled',        // Disable animations for consistency
  }
}
```

### Adjusting Tolerance
If tests are too sensitive or too lenient:

1. Edit `playwright.config.ts`
2. Adjust `maxDiffPixels` or `threshold` values
3. Re-run tests

## Best Practices

### 1. Consistent Test Environment
- Run tests on the same OS for baseline creation
- Use CI/CD for consistent environment (recommended)
- Avoid updating baselines locally if possible

### 2. Handling Dynamic Content
```typescript
// Hide dynamic timestamps
await page.locator('[data-testid="timestamp"]').evaluate(el => el.style.visibility = 'hidden');

// Replace dynamic text
await page.locator('[data-testid="user-id"]').evaluate(el => el.textContent = 'USER-123');
```

### 3. Wait for Stability
```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="content"]');

// Wait for animations
await page.waitForTimeout(500);
```

### 4. Debugging Failures
```bash
# Run in headed mode to see what's happening
npx playwright test e2e/visual-regression/ --headed --project=chromium

# Debug specific test
npx playwright test e2e/visual-regression/public-pages.spec.ts:15 --debug
```

### 5. CI/CD Integration
Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run visual regression tests
  run: npm run test:visual

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Problem: Tests fail on CI but pass locally
**Solution**: Font rendering differences between OS. Use Docker for consistent environment or adjust tolerance.

### Problem: Tests are flaky (sometimes pass, sometimes fail)
**Solution**: 
- Increase `waitForLoadState('networkidle')` usage
- Disable animations in test config
- Hide/mock dynamic content

### Problem: Screenshots show blank page
**Solution**: 
- Check if page loaded: `await page.waitForLoadState('networkidle')`
- Verify authentication worked in dashboard tests
- Check console for JS errors: `page.on('console', msg => console.log(msg))`

### Problem: Too many small differences detected
**Solution**: Increase `maxDiffPixels` or `threshold` in config

### Problem: Large UI changes require updating all baselines
**Solution**: 
```bash
# Update all at once
npm run test:visual:update

# Or update per browser
npx playwright test e2e/visual-regression/ --project=chromium --update-snapshots
npx playwright test e2e/visual-regression/ --project=firefox --update-snapshots
```

## Resources

- [Playwright Visual Comparisons Docs](https://playwright.dev/docs/test-snapshots)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For questions or issues with visual regression testing:
1. Check this guide first
2. Review Playwright documentation
3. Check existing test reports for patterns
4. Consult the team for complex regressions
