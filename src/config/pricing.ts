/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 */

export interface PricingTier {
  id: 'free' | 'pro' | 'premium';
  name: string;
  price: string;
  priceValue: number;
  costPerClick: string;
  costPerClickValue: number;
  leadCost: string;
  leadCostValue: number;
  commission: string;
  commissionValue: number;
  escrowFee: string;
  escrowFeeValue: number;
  freeEstimateCost: string;
  freeEstimateCostValue: number;
  hourlyRateCharge: string;
  hourlyRateChargeMultiplier: number;
  escrowProcessingFee: string;
  escrowProcessingFeeValue: number;
  escrowProcessingMinimum: number;
  minimumFee: number;
  priceId: string | null;
  productId: string | null;
  popular: boolean;
}

export const PRICING_TIERS: Record<'free' | 'pro' | 'premium', PricingTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceValue: 0,
    costPerClick: '$125',
    costPerClickValue: 125,
    leadCost: '$20',
    leadCostValue: 20,
    commission: '9%',
    commissionValue: 9,
    escrowFee: '10%',
    escrowFeeValue: 10,
    freeEstimateCost: '$150',
    freeEstimateCostValue: 150,
    hourlyRateCharge: '3 hours',
    hourlyRateChargeMultiplier: 3,
    escrowProcessingFee: '9% per payment (min $10)',
    escrowProcessingFeeValue: 0.09,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: null,
    productId: null,
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$99',
    priceValue: 99,
    costPerClick: '$100',
    costPerClickValue: 100,
    leadCost: '$10',
    leadCostValue: 10,
    commission: '6%',
    commissionValue: 6,
    escrowFee: '6%',
    escrowFeeValue: 6,
    freeEstimateCost: '$100',
    freeEstimateCostValue: 100,
    hourlyRateCharge: '2 hours',
    hourlyRateChargeMultiplier: 2,
    escrowProcessingFee: '8% per payment (min $10)',
    escrowProcessingFeeValue: 0.08,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: 'price_1STAlCRuFpm7XGfu6g6mrnRV',
    productId: 'prod_TQ0mK76zTAwoQc',
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: '$599',
    priceValue: 599,
    costPerClick: '$75',
    costPerClickValue: 75,
    leadCost: '$5',
    leadCostValue: 5,
    commission: '0%',
    commissionValue: 0,
    escrowFee: '3%',
    escrowFeeValue: 3,
    freeEstimateCost: '$50',
    freeEstimateCostValue: 50,
    hourlyRateCharge: '1 hour',
    hourlyRateChargeMultiplier: 1,
    escrowProcessingFee: '4% per payment (min $10)',
    escrowProcessingFeeValue: 0.04,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: 'price_1STAlDRuFpm7XGfuoEnpBk4T',
    productId: 'prod_TQ0mVQT1H5f1zg',
    popular: false,
  },
};

export const getPricingTier = (tier: 'free' | 'pro' | 'premium' = 'free'): PricingTier => {
  return PRICING_TIERS[tier];
};
