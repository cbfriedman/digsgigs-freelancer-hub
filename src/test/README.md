# Unit Tests

This directory contains unit tests for the application.

## Running Tests

To run all tests:
```bash
npm run test
```

To run tests in watch mode:
```bash
npm run test:watch
```

To run tests with UI:
```bash
npm run test:ui
```

## Test Coverage

To generate test coverage report:
```bash
npm run test:coverage
```

## Adding the Test Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Current Test Files

- `src/hooks/useCommissionCalculator.test.ts` - Tests for commission calculator hook, including comprehensive tests for the `calculateFreeEstimateRebate` function covering:
  - Fixed-price contracts at exactly $5,000 (all tiers)
  - Fixed-price contracts above and below $5,000
  - Hourly contracts (no rebates)
  - Edge cases ($0, very large amounts, threshold boundaries)
  - Tier-specific rebate amounts (Free: $150, Pro: $100, Premium: $50)
