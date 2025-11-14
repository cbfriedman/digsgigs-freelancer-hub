/**
 * Hook for calculating per-lead costs based on subscription tier
 * Rates: Free ($3/lead), Pro ($2/lead), Premium ($0/lead)
 */
export const useCommissionCalculator = () => {
  const calculateLeadCost = (
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    leadCost: number;
  } => {
    let leadCost = 3; // Default: free tier ($3 per lead)

    // Determine lead cost based on tier
    if (tier === 'premium') {
      leadCost = 0; // $0 per lead
    } else if (tier === 'pro') {
      leadCost = 2; // $2 per lead
    } else {
      leadCost = 3; // $3 per lead (free)
    }

    return {
      leadCost,
    };
  };

  // Keep the old function for backward compatibility during transition
  const calculateCommission = (
    totalAmount: number,
    tier: 'free' | 'pro' | 'premium' = 'free'
  ): {
    rate: number;
    commissionAmount: number;
    diggerPayout: number;
    minimumFee: number;
  } => {
    let commissionRate = 0.09;
    let minimumFee = 5;

    if (tier === 'premium') {
      commissionRate = 0.00;
      minimumFee = 0;
    } else if (tier === 'pro') {
      commissionRate = 0.04;
      minimumFee = 5;
    } else {
      commissionRate = 0.09;
      minimumFee = 5;
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
