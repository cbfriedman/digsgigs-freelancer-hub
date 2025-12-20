import { INDUSTRY_PRICING, getLeadCostForIndustry } from '@/config/pricing';

/**
 * Hook for calculating lead costs based on industry
 * 
 * SIMPLIFIED PRICING MODEL - All leads are non-exclusive:
 * - Low-value industries: $7.50
 * - Mid-value industries: $14.50
 * - High-value industries: $24.50
 * 
 * Confirmed leads add 20% premium.
 * 
 * NOTE: Exclusivity and escrow features have been removed.
 */
export const useCommissionCalculator = () => {
  /**
   * Calculate lead cost for a specific industry
   * Returns default mid-value if industry not specified
   * 
   * @param _exclusivity - DEPRECATED: ignored, all leads are non-exclusive
   * @param industry - The industry/profession
   * @param isConfirmed - Whether the lead is confirmed (adds 20% premium)
   */
  const calculateLeadCost = (
    _exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive',
    industry?: string,
    isConfirmed: boolean = false
  ): {
    leadCost: number;
  } => {
    // All leads are now non-exclusive
    if (industry) {
      return { leadCost: getLeadCostForIndustry(industry, 'non-exclusive', isConfirmed) };
    }
    
    // Default to mid-value pricing if no industry specified
    const basePrice = INDUSTRY_PRICING[1].nonExclusive;
    
    // Add 20% confirmation premium for confirmed leads
    if (isConfirmed) {
      return { leadCost: Math.round(basePrice * 1.20 * 2) / 2 }; // Round to nearest $0.50
    }
    
    return { leadCost: basePrice };
  };

  /**
   * Commission calculation - DEPRECATED
   * Returns zeros for backward compatibility
   */
  const calculateCommission = (
    totalAmount: number,
    _tier: 'free' | 'pro' | 'premium' = 'free'
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
   */
  const calculateHourlyAwardCost = (
    _averageHourlyRate: number,
    _tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    return 0;
  };

  /**
   * Escrow fee calculation - DEPRECATED
   * Escrow feature has been removed
   */
  const calculateEscrowFee = (
    _amount: number,
    _exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive'
  ): number => {
    return 0; // Escrow feature removed
  };

  /**
   * Free estimate cost calculation - DEPRECATED
   */
  const calculateFreeEstimateCost = (
    _tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    return 0;
  };

  /**
   * Free estimate rebate calculation - DEPRECATED
   */
  const calculateFreeEstimateRebate = (
    _projectAmount: number,
    _pricingModel: 'fixed' | 'hourly',
    _tier: 'free' | 'pro' | 'premium' = 'free',
    _freeEstimatePaid: boolean = false
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
