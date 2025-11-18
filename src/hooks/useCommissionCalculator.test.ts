import { describe, it, expect } from 'vitest';
import { useCommissionCalculator } from './useCommissionCalculator';

describe('useCommissionCalculator', () => {
  describe('calculateFreeEstimateRebate', () => {
    const { calculateFreeEstimateRebate } = useCommissionCalculator();

    describe('Fixed-price contracts', () => {
      it('should apply rebate for fixed-price contract exactly at $5,000 (Free tier)', () => {
        const result = calculateFreeEstimateRebate(5000, 'fixed', 'free', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(150); // Free tier free estimate cost
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });

      it('should apply rebate for fixed-price contract exactly at $5,000 (Pro tier)', () => {
        const result = calculateFreeEstimateRebate(5000, 'fixed', 'pro', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(100); // Pro tier free estimate cost
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });

      it('should apply rebate for fixed-price contract exactly at $5,000 (Premium tier)', () => {
        const result = calculateFreeEstimateRebate(5000, 'fixed', 'premium', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(50); // Premium tier free estimate cost
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });

      it('should apply rebate for fixed-price contract over $5,000', () => {
        const result = calculateFreeEstimateRebate(10000, 'fixed', 'pro', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(100);
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });

      it('should NOT apply rebate for fixed-price contract under $5,000', () => {
        const result = calculateFreeEstimateRebate(4999, 'fixed', 'free', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('Rebates only available for contracts of $5,000 or more');
      });

      it('should NOT apply rebate for fixed-price contract at $4,500', () => {
        const result = calculateFreeEstimateRebate(4500, 'fixed', 'pro', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('Rebates only available for contracts of $5,000 or more');
      });

      it('should NOT apply rebate when free estimate was not paid (even if >= $5,000)', () => {
        const result = calculateFreeEstimateRebate(10000, 'fixed', 'pro', false);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBeUndefined();
      });
    });

    describe('Hourly contracts', () => {
      it('should NOT apply rebate for hourly contract regardless of amount', () => {
        const result = calculateFreeEstimateRebate(10000, 'hourly', 'free', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('No rebates available for hourly rate contracts');
      });

      it('should NOT apply rebate for hourly contract at exactly $5,000', () => {
        const result = calculateFreeEstimateRebate(5000, 'hourly', 'pro', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('No rebates available for hourly rate contracts');
      });

      it('should NOT apply rebate for hourly contract over $5,000 (Premium tier)', () => {
        const result = calculateFreeEstimateRebate(8000, 'hourly', 'premium', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('No rebates available for hourly rate contracts');
      });

      it('should NOT apply rebate for hourly contract when free estimate not paid', () => {
        const result = calculateFreeEstimateRebate(10000, 'hourly', 'free', false);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBeUndefined();
      });
    });

    describe('Edge cases', () => {
      it('should handle $0 project amount', () => {
        const result = calculateFreeEstimateRebate(0, 'fixed', 'pro', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('Rebates only available for contracts of $5,000 or more');
      });

      it('should handle very large project amounts', () => {
        const result = calculateFreeEstimateRebate(1000000, 'fixed', 'free', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(150);
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });

      it('should handle $4,999.99 (just under threshold)', () => {
        const result = calculateFreeEstimateRebate(4999.99, 'fixed', 'premium', true);
        
        expect(result.rebateApplied).toBe(false);
        expect(result.rebateAmount).toBe(0);
        expect(result.rebateReason).toBe('Rebates only available for contracts of $5,000 or more');
      });

      it('should handle $5,000.01 (just over threshold)', () => {
        const result = calculateFreeEstimateRebate(5000.01, 'fixed', 'premium', true);
        
        expect(result.rebateApplied).toBe(true);
        expect(result.rebateAmount).toBe(50);
        expect(result.rebateReason).toBe('Fixed-price contract of $5,000 or more');
      });
    });

    describe('Tier-specific rebate amounts', () => {
      it('should return correct rebate amount for Free tier', () => {
        const result = calculateFreeEstimateRebate(6000, 'fixed', 'free', true);
        
        expect(result.rebateAmount).toBe(150);
      });

      it('should return correct rebate amount for Pro tier', () => {
        const result = calculateFreeEstimateRebate(6000, 'fixed', 'pro', true);
        
        expect(result.rebateAmount).toBe(100);
      });

      it('should return correct rebate amount for Premium tier', () => {
        const result = calculateFreeEstimateRebate(6000, 'fixed', 'premium', true);
        
        expect(result.rebateAmount).toBe(50);
      });
    });
  });
});
