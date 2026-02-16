import { describe, it, expect } from 'vitest';
import { useCommissionCalculator } from './useCommissionCalculator';

/**
 * calculateFreeEstimateRebate is DEPRECATED - always returns zeros.
 * These tests document the current (deprecated) behavior.
 */
describe('useCommissionCalculator', () => {
  describe('calculateFreeEstimateRebate (deprecated)', () => {
    const { calculateFreeEstimateRebate } = useCommissionCalculator();

    it('returns zero rebate for all inputs (feature deprecated)', () => {
      const result = calculateFreeEstimateRebate(6000, 'fixed', 'premium', true);
      expect(result.rebateApplied).toBe(false);
      expect(result.rebateAmount).toBe(0);
    });

    it('returns consistent zeros across tiers', () => {
      expect(calculateFreeEstimateRebate(5000, 'fixed', 'free', true).rebateAmount).toBe(0);
      expect(calculateFreeEstimateRebate(5000, 'fixed', 'pro', true).rebateAmount).toBe(0);
      expect(calculateFreeEstimateRebate(5000, 'fixed', 'premium', true).rebateAmount).toBe(0);
    });

    it('returns zeros for hourly contracts', () => {
      const result = calculateFreeEstimateRebate(10000, 'hourly', 'free', true);
      expect(result.rebateApplied).toBe(false);
      expect(result.rebateAmount).toBe(0);
    });
  });
});
