/**
 * Hook for calculating costs based on subscription tier and pricing model
 * 
 * Pricing Models:
 * - 'commission': Tier-based lead costs upfront + award fee on completed work
 *   - Free: $60/lead + $60 award fee + 10% escrow
 *   - Pro: $40/lead + $40 award fee + 6% escrow
 *   - Premium: $0/lead + $0 award fee + 3% escrow
 * 
 * - 'hourly': Tier-based lead cost upfront + hourly rate multiplier when awarded
 *   - Upfront: Free ($60), Pro ($40), Premium ($0)
 *   - When awarded: 3x / 2x / 1x average hourly rate + 10%/6%/3% escrow
 * 
 * - 'escrow': Tier-based escrow processing fees on milestone payments
 *   - Free: 10% of milestone amount
 *   - Pro: 6% of milestone amount
 *   - Premium: 3% of milestone amount
 * 
 * - 'both': Combination - higher of fixed award fee OR hourly multiplier + escrow
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
    // Fixed award fees (not percentage-based)
    const awardFees = { free: 60, pro: 40, premium: 0 };
    const commissionAmount = awardFees[tier];
    const diggerPayout = totalAmount - commissionAmount;

    return {
      rate: 0, // Not percentage-based anymore
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
    let feeRate = 0.10; // Default: free tier (10%)

    if (tier === 'premium') {
      feeRate = 0.03; // 3%
    } else if (tier === 'pro') {
      feeRate = 0.06; // 6%
    }

    return amount * feeRate;
  };

  return { calculateLeadCost, calculateCommission, calculateHourlyAwardCost, calculateEscrowFee };
};
