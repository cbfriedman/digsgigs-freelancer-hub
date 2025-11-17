/**
 * Hook for calculating costs based on subscription tier and pricing model
 * 
 * Pricing Models:
 * - 'commission': Tier-based lead costs + commission on completed work
 *   - Free: $3/lead + 9% commission ($5 min)
 *   - Pro: $1.50/lead + 4% commission ($5 min)
 *   - Premium: $0/lead + 0% commission
 * 
 * - 'hourly': Hourly rate-based lead costs (1 hour of rate) + no commission
 * 
 * - 'both': (Construction/Trades) Combination of both models available
 */
export const useCommissionCalculator = () => {
  const calculateLeadCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    leadCost: number;
  } => {
    let leadCost = 3; // Default: free tier ($3 per lead)

    if (tier === 'premium') {
      leadCost = 0; // $0 per lead
    } else if (tier === 'pro') {
      leadCost = 1.5; // $1.50 per lead
    } else {
      leadCost = 3; // $3 per lead (free)
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
    let commissionRate = 0.09; // Default: free tier (9%)
    let minimumFee = 5; // $5 minimum for free and pro

    if (tier === 'premium') {
      commissionRate = 0.00; // 0% commission
      minimumFee = 0; // No minimum
    } else if (tier === 'pro') {
      commissionRate = 0.04; // 4% commission
      minimumFee = 5; // $5 minimum
    } else {
      commissionRate = 0.09; // 9% commission (free)
      minimumFee = 5; // $5 minimum
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

  return { calculateLeadCost, calculateCommission };
};
