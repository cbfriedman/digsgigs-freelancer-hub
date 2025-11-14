/**
 * Hook for calculating commission based on subscription tier
 * Rates: Free (9%, $5 min), Pro (4%, $5 min), Premium (0%, no min)
 */
export const useCommissionCalculator = () => {
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

    // Determine commission rate and minimum based on tier
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

    // Calculate commission with minimum
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

  return { calculateCommission };
};
