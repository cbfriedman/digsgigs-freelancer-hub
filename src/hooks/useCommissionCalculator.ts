/**
 * Hook for calculating costs based on subscription tier and pricing model
 * 
 * Pricing Models:
 * - 'commission': Tier-based lead costs upfront + percentage-based contract award fee
 *   - Free: $60/lead + 10% contract award fee + 5% escrow (min $10)
 *   - Pro: $40/lead + 6% contract award fee + 5% escrow (min $10)
 *   - Premium: $0/lead + 3% contract award fee + 5% escrow (min $10)
 * 
 * - 'hourly': Tier-based lead cost upfront + hourly rate multiplier when awarded
 *   - Upfront: Free ($60), Pro ($40), Premium ($0)
 *   - When awarded: 3x / 2x / 1x average hourly rate + 5% escrow (min $10)
 * 
 * - 'escrow': Processing fee on each milestone payment released
 *   - All tiers: 5% of milestone amount (minimum $10)
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
    let leadCost = 60; // Default: free tier ($60 per lead)

    if (tier === 'premium') {
      leadCost = 0; // $0 per lead
    } else if (tier === 'pro') {
      leadCost = 40; // $40 per lead
    } else {
      leadCost = 60; // $60 per lead (free)
    }

    return {
      leadCost,
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
    // Contract award fees (percentage-based)
    const awardFeePercentages = { free: 0.10, pro: 0.06, premium: 0.03 };
    const commissionAmount = totalAmount * awardFeePercentages[tier];
    const diggerPayout = totalAmount - commissionAmount;

    return {
      rate: awardFeePercentages[tier] * 100, // Return as percentage
      commissionAmount,
      diggerPayout,
      minimumFee: 0,
    };
  };

  const calculateHourlyAwardCost = (
    averageHourlyRate: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    let multiplier = 3; // Default: free tier (3x average rate)

    if (tier === 'premium') {
      multiplier = 1; // 1x average rate
    } else if (tier === 'pro') {
      multiplier = 2; // 2x average rate
    }

    return averageHourlyRate * multiplier;
  };

  const calculateEscrowFee = (
    amount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    // Escrow processing fee: 5% with $10 minimum (same for all tiers)
    const feeRate = 0.05;
    const calculatedFee = amount * feeRate;
    const minimumFee = 10;
    
    return Math.max(calculatedFee, minimumFee);
  };

  const calculateFreeEstimateCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): number => {
    const estimateCosts = { free: 150, pro: 100, premium: 50 };
    return estimateCosts[tier];
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
