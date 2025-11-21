import { PRICING_TIERS, INDUSTRY_PRICING, getLeadCostForIndustry } from '@/config/pricing';

/**
 * Hook for calculating costs based on exclusivity and industry
 * Uses centralized industry-specific pricing configuration from @/config/pricing
 * 
 * EXCLUSIVITY-BASED PRICING MODEL:
 * - Non-exclusive leads: Bark price - $0.50
 *   - Low-value: $7.50
 *   - Mid-value: $14.50
 *   - High-value: $24.50
 * 
 * - 24-hour exclusive leads: Google CPC × 2.5
 *   - Low-value: $30.00
 *   - Mid-value: $87.50
 *   - High-value: $187.50
 * 
 * - Escrow processing fees (optional, paid by digger):
 *   - All tiers: 8% (min $10)
 */
export const useCommissionCalculator = () => {
  /**
   * Calculate lead cost for a specific industry and exclusivity type
   * Returns default mid-value if industry not specified
   */
  const calculateLeadCost = (
    exclusivity: 'non-exclusive' | 'exclusive-24h' = 'non-exclusive',
    industry?: string
  ): {
    leadCost: number;
  } => {
    if (industry) {
      return { leadCost: getLeadCostForIndustry(industry, exclusivity) };
    }
    
    // Default to mid-value pricing if no industry specified
    return { 
      leadCost: exclusivity === 'non-exclusive' 
        ? INDUSTRY_PRICING[1].nonExclusive 
        : INDUSTRY_PRICING[1].exclusive24h 
    };
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
    exclusivity: 'non-exclusive' | 'exclusive-24h' = 'non-exclusive'
  ): number => {
    const pricingTier = PRICING_TIERS[exclusivity];
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
