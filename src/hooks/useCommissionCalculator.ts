import { PRICING_TIERS } from '@/config/pricing';

/**
 * Hook for calculating costs based on subscription tier and pricing model
 * Uses centralized pricing configuration from @/config/pricing
 * 
 * Pricing Models:
 * - Lead costs: $20 (Free), $10 (Pro), $5 (Premium)
 * 
 * - 'hourly': Tier-based lead cost upfront + hourly rate multiplier when awarded
 *   - Upfront: Free ($20), Pro ($10), Premium ($5)
 *   - When awarded: 3x / 2x / 1x average hourly rate + escrow fee
 * 
 * - 'escrow': Processing fee on each milestone payment released
 *   - Free: 9% of milestone amount (minimum $10)
 *   - Pro: 8% of milestone amount (minimum $10)
 *   - Premium: 4% of milestone amount (minimum $10)
 * 
 * - 'free_estimate': Upfront cost with conditional rebate on award
 *   - Costs: Free ($150), Pro ($100), Premium ($50)
 *   - Rebate rules: Only for fixed-price contracts of $5,000 or more
 *   - No rebates for hourly rate contracts
 */
export const useCommissionCalculator = () => {
  const calculateLeadCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    leadCost: number;
  } => {
    const pricingTier = PRICING_TIERS[tier];
    return {
      leadCost: pricingTier.leadCostValue,
    };
  };

  const calculateCommission = (
    totalAmount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    rate: number;
    commissionAmount: number;
    diggerPayout: number;
    minimumFee: number;
  } => {
    // No contract award fees anymore - returning zeros for backward compatibility
    return {
      rate: 0,
      commissionAmount: 0,
      diggerPayout: totalAmount,
      minimumFee: 0,
    };
  };

  const calculateHourlyAwardCost = (
    averageHourlyRate: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    const pricingTier = PRICING_TIERS[tier];
    return averageHourlyRate * pricingTier.hourlyRateChargeMultiplier;
  };

  const calculateEscrowFee = (
    amount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    const pricingTier = PRICING_TIERS[tier];
    const calculatedFee = amount * pricingTier.escrowProcessingFeeValue;
    return Math.max(calculatedFee, pricingTier.escrowProcessingMinimum);
  };

  const calculateFreeEstimateCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    const pricingTier = PRICING_TIERS[tier];
    return pricingTier.freeEstimateCostValue;
  };

  const calculateFreeEstimateRebate = (
    projectAmount: number,
    pricingModel: 'fixed' | 'hourly',
    tier: 'free' | 'pro' | 'premium' = 'free',
    freeEstimatePaid: boolean = false
  ): { rebateAmount: number; rebateApplied: boolean; rebateReason?: string } => {
    if (!freeEstimatePaid) {
      return { rebateAmount: 0, rebateApplied: false };
    }

    const freeEstimateCost = calculateFreeEstimateCost(tier);

    // New rules: Only apply rebates for fixed-price contracts of $5,000 or more
    // No rebates for hourly rate contracts
    if (pricingModel === 'fixed' && projectAmount >= 5000) {
      return {
        rebateAmount: freeEstimateCost,
        rebateApplied: true,
        rebateReason: 'Fixed-price contract of $5,000 or more'
      };
    } else if (pricingModel === 'hourly') {
      return {
        rebateAmount: 0,
        rebateApplied: false,
        rebateReason: 'No rebates available for hourly rate contracts'
      };
    } else if (pricingModel === 'fixed' && projectAmount < 5000) {
      return {
        rebateAmount: 0,
        rebateApplied: false,
        rebateReason: 'Rebates only available for contracts of $5,000 or more'
      };
    }

    return { rebateAmount: 0, rebateApplied: false };
  };

  return { 
    calculateLeadCost, 
    calculateCommission, 
    calculateHourlyAwardCost, 
    calculateEscrowFee,
    calculateFreeEstimateCost,
    calculateFreeEstimateRebate
  };
};
