import { PRICING_TIERS, INDUSTRY_PRICING, getLeadCostForIndustry } from '@/config/pricing';

/**
 * Hook for calculating costs based on subscription tier, pricing model, and industry
 * Uses centralized industry-specific pricing configuration from @/config/pricing
 * 
 * NEW PRICING MODEL (CPL Only - No Commissions):
 * - Industry-specific lead costs based on three value tiers:
 *   - Low-value (cleaning, handyman): $15/$10/$5 (Free/Pro/Premium)
 *   - Mid-value (HVAC, plumbing, etc.): $40/$25/$15
 *   - High-value (legal, insurance): $200/$125/$75
 * 
 * - Escrow processing fees only:
 *   - Free: 9% (min $10)
 *   - Pro: 5% (min $10)
 *   - Premium: 2% (min $10)
 */
export const useCommissionCalculator = () => {
  /**
   * Calculate lead cost for a specific industry and tier
   * Returns default mid-value if industry not specified
   */
  const calculateLeadCost = (
    tier: 'free' | 'pro' | 'premium' = 'free',
    industry?: string
  ): {
    leadCost: number;
  } => {
    if (industry) {
      return { leadCost: getLeadCostForIndustry(industry, tier) };
    }
    
    // Default to mid-value pricing if no industry specified
    return { leadCost: INDUSTRY_PRICING[1][tier] };
  };

  /**
   * Commission calculation - DEPRECATED
   * Returns zeros for backward compatibility
   * New pricing model is CPL only with no commissions
   */
  const calculateCommission = (
    totalAmount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    rate: number;
    commissionAmount: number;
    diggerPayout: number;
    minimumFee: number;
  } => {
    return {
      rate: 0,
      commissionAmount: 0,
      diggerPayout: totalAmount,
      minimumFee: 0,
    };
  };

  /**
   * Hourly award cost calculation - DEPRECATED
   * Returns 0 for backward compatibility
   * New pricing model eliminates hourly multiplier charges
   */
  const calculateHourlyAwardCost = (
    averageHourlyRate: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    return 0;
  };

  /**
   * Calculate escrow processing fee
   */
  const calculateEscrowFee = (
    amount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    const pricingTier = PRICING_TIERS[tier];
    const calculatedFee = amount * pricingTier.escrowProcessingFeeValue;
    return Math.max(calculatedFee, pricingTier.escrowProcessingMinimum);
  };

  /**
   * Free estimate cost calculation - DEPRECATED
   * Returns 0 for backward compatibility
   * New pricing model eliminates free estimate upcharges
   */
  const calculateFreeEstimateCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    return 0;
  };

  /**
   * Free estimate rebate calculation - DEPRECATED
   * Returns no rebate for backward compatibility
   * New pricing model eliminates free estimate system
   */
  const calculateFreeEstimateRebate = (
    projectAmount: number,
    pricingModel: 'fixed' | 'hourly',
    tier: 'free' | 'pro' | 'premium' = 'free',
    freeEstimatePaid: boolean = false
  ): { rebateAmount: number; rebateApplied: boolean; rebateReason?: string } => {
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
