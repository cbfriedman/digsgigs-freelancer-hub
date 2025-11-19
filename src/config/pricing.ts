/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 * INDUSTRY-SPECIFIC CPL PRICING MODEL (No commissions, no CPC, no hourly charges)
 */

export type IndustryCategory = 'low-value' | 'mid-value' | 'high-value';

export interface IndustryPricing {
  category: IndustryCategory;
  industries: string[];
  free: number;
  pro: number;
  premium: number;
}

export interface PricingTier {
  id: 'free' | 'pro' | 'premium';
  name: string;
  price: string;
  priceValue: number;
  escrowFee: string;
  escrowFeeValue: number;
  escrowProcessingFee: string;
  escrowProcessingFeeValue: number;
  escrowProcessingMinimum: number;
  priceId: string | null;
  productId: string | null;
  popular: boolean;
}

// Industry-specific lead pricing (CPC-based: 3×, 2×, 1× Google CPC)
export const INDUSTRY_PRICING: IndustryPricing[] = [
  {
    category: 'low-value',
    industries: [
      'Cleaning & Janitorial',
      'Handyman Services',
      'Pet Care & Grooming',
      'Tutoring & Education',
      'Moving & Delivery',
      'Event Planning',
      'Photography',
      'Catering',
      'Beauty & Wellness'
    ],
    free: 24,   // 3× avg CPC ($8)
    pro: 16,    // 2× avg CPC ($8)
    premium: 8  // 1× avg CPC ($8)
  },
  {
    category: 'mid-value',
    industries: [
      'HVAC',
      'Plumbing',
      'Electrical',
      'Landscaping',
      'Roofing',
      'Carpentry',
      'Painting',
      'Flooring',
      'General Contracting',
      'Auto Repair',
      'Appliance Repair',
      'Pest Control',
      'Tree Service',
      'Masonry',
      'Windows & Doors',
      'Concrete Work',
      'Fencing',
      'Pool Service'
    ],
    free: 120,  // 3× avg CPC ($40)
    pro: 80,    // 2× avg CPC ($40)
    premium: 40 // 1× avg CPC ($40)
  },
  {
    category: 'high-value',
    industries: [
      'Legal Services',
      'Insurance',
      'Financial Planning',
      'Real Estate',
      'Medical & Dental',
      'Accounting',
      'IT Consulting',
      'Marketing & Advertising',
      'Architecture',
      'Engineering',
      'Business Consulting'
    ],
    free: 750,   // 3× avg CPC ($250)
    pro: 500,    // 2× avg CPC ($250)
    premium: 250 // 1× avg CPC ($250)
  }
];

export const PRICING_TIERS: Record<'free' | 'pro' | 'premium', PricingTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceValue: 0,
    escrowFee: '9%',
    escrowFeeValue: 9,
    escrowProcessingFee: '9% per payment (min $10)',
    escrowProcessingFeeValue: 0.09,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$39',
    priceValue: 39,
    escrowFee: '5%',
    escrowFeeValue: 5,
    escrowProcessingFee: '5% per payment (min $10)',
    escrowProcessingFeeValue: 0.05,
    escrowProcessingMinimum: 10,
    priceId: 'price_1STAlCRuFpm7XGfu6g6mrnRV',
    productId: 'prod_TQ0mK76zTAwoQc',
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: '$99',
    priceValue: 99,
    escrowFee: '3%',
    escrowFeeValue: 3,
    escrowProcessingFee: '3% per payment (min $10)',
    escrowProcessingFeeValue: 0.03,
    escrowProcessingMinimum: 10,
    priceId: 'price_1STAlDRuFpm7XGfuoEnpBk4T',
    productId: 'prod_TQ0mVQT1H5f1zg',
    popular: false,
  },
};

// Helper function to get lead cost for a specific industry and tier
export const getLeadCostForIndustry = (
  industry: string,
  tier: 'free' | 'pro' | 'premium'
): number => {
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.includes(industry)
  );
  
  if (!industryData) {
    // Default to mid-value if industry not found
    return INDUSTRY_PRICING[1][tier];
  }
  
  return industryData[tier];
};

// Helper function to get industry category
export const getIndustryCategory = (industry: string): IndustryCategory => {
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.includes(industry)
  );
  
  return industryData?.category || 'mid-value';
};

export const getPricingTier = (tier: 'free' | 'pro' | 'premium' = 'free'): PricingTier => {
  return PRICING_TIERS[tier];
};

// Get all industries as a flat list
export const getAllIndustries = (): string[] => {
  return INDUSTRY_PRICING.flatMap(pricing => pricing.industries).sort();
};
