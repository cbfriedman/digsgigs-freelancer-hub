/**
 * Hook for calculating costs based on subscription tier and pricing model
 * 
 * Pricing Models:
 * - 'commission': Tier-based lead costs upfront + commission on completed work
 *   - Free: $5/lead + 9% commission
 *   - Pro: $3/lead + 6% commission
 *   - Premium: $0/lead + 0% commission
 * 
 * - 'hourly': Tier-based lead cost upfront + 2-hour rate when awarded
 *   - Upfront: Free ($5), Pro ($3), Premium ($0)
 *   - When awarded: 2 hours of digger's rate
 *   - No commission on completed work
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
    let commissionRate = 0.06; // Default: free tier (6% for fixed price)
    let minimumFee = 0; // No minimum fees

    if (tier === 'premium') {
      commissionRate = 0.00; // 0% commission
      minimumFee = 0; // No minimum
    } else if (tier === 'pro') {
      commissionRate = 0.03; // 3% commission
      minimumFee = 0; // No minimum
    } else {
      commissionRate = 0.06; // 6% commission (free)
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

  return { calculateLeadCost, calculateCommission, calculateHourlyAwardCost };
};
