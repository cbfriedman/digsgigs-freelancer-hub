/**
 * Hook for calculating costs based on subscription tier and pricing model
 * 
 * Pricing Models:
 * - 'commission': Tier-based lead costs upfront + commission on completed work
 *   - Free: $5/lead + 9% commission
 *   - Pro: $3/lead + 6% commission
 *   - Premium: $0/lead + 0% commission
 * 
 * - 'hourly': Tier-based lead cost upfront + hourly rate multiplier when awarded
 *   - Upfront: Free ($5), Pro ($3), Premium ($0)
 *   - When awarded: 3x / 2x / 1x average hourly rate
 *   - No commission on completed work
 * 
 * - 'escrow': Tier-based escrow processing fees on milestone payments
 *   - Free: 10% of milestone amount
 *   - Pro: 6% of milestone amount
 *   - Premium: 3% of milestone amount
 * 
 * - 'both': (Construction/Trades) Combination of both models available
 */
export const useCommissionCalculator = () => {
  const calculateLeadCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    leadCost: number;
  } => {
    let leadCost = 5; // Default: free tier ($5 per lead)

    if (tier === 'premium') {
      leadCost = 0; // $0 per lead
    } else if (tier === 'pro') {
      leadCost = 3; // $3 per lead
    } else {
      leadCost = 5; // $5 per lead (free)
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
    let commissionRate = 0.09; // Default: free tier (9% for fixed price)
    let minimumFee = 0; // No minimum fees

    if (tier === 'premium') {
      commissionRate = 0.00; // 0% commission
      minimumFee = 0; // No minimum
    } else if (tier === 'pro') {
      commissionRate = 0.06; // 6% commission
      minimumFee = 0; // No minimum
    } else {
      commissionRate = 0.09; // 9% commission (free)
      minimumFee = 0; // No minimum
    }

    const calculatedCommission = totalAmount * commissionRate;
    const commissionAmount = Math.max(calculatedCommission, minimumFee);
    const diggerPayout = totalAmount - commissionAmount;

    return {
      rate: commissionRate,
      commissionAmount,
      diggerPayout,
      minimumFee,
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
