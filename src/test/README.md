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

### Unit Tests
- `src/hooks/useCommissionCalculator.test.ts` - Tests for commission calculator hook, including comprehensive tests for the `calculateFreeEstimateRebate` function covering:
  - Fixed-price contracts at exactly $5,000 (all tiers)
  - Fixed-price contracts above and below $5,000
  - Hourly contracts (no rebates)
  - Edge cases ($0, very large amounts, threshold boundaries)
  - Tier-specific rebate amounts (Free: $150, Pro: $100, Premium: $50)

### Integration Tests
- `src/components/ProjectCostCalculator.test.tsx` - Integration tests for the ProjectCostCalculator component covering:
  - Free estimate checkbox behavior and alerts
  - Fixed-price contract rebate display and calculations
  - Hourly contract rebate exclusions
  - Threshold boundary transitions ($4,999 → $5,000 → $4,500)
  - Tier-specific rebate amounts in UI
  - Cost calculation accuracy with rebates applied
  - All user interaction scenarios (checkbox toggles, slider changes, tier selections)

## Test Coverage Summary

The test suite provides comprehensive coverage for the new free estimate rebate rules:
- ✅ Fixed-price contracts ≥ $5,000 qualify for rebates
- ✅ Fixed-price contracts < $5,000 do not qualify
- ✅ Hourly contracts never qualify for rebates
- ✅ All three tiers (Free, Pro, Premium) correctly calculate rebates
- ✅ UI correctly displays rebate status and amounts
- ✅ User interactions properly trigger rebate calculations
