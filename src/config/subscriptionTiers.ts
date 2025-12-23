/**
 * Geographic Subscription Tiers Configuration
 * 
 * Pricing Model:
 * - Local: Serves a single city/metro area
 * - Statewide: Serves an entire state
 * - Nationwide: Serves the entire country
 * 
 * Industry Types:
 * - LV/MV: Low/Medium Value industries (e.g., cleaning, handyman, tutoring)
 * - HV: High Value industries (e.g., legal, insurance, real estate, financial)
 * 
 * Price Lock:
 * - 12-month price guarantee from sign-up date
 * - After 12 months, checked monthly:
 *   - < 2 clicks previous month = price lock continues
 *   - >= 2 clicks previous month = updates to current rates
 */

export type GeographicTier = 'local' | 'statewide' | 'nationwide';
export type IndustryType = 'lv_mv' | 'hv';
export type BillingCycle = 'monthly' | 'annual';

export interface SubscriptionTier {
  key: string;
  geographic_tier: GeographicTier;
  industry_type: IndustryType;
  monthly_price_cents: number;
  annual_price_cents: number;
  stripe_price_id_monthly: string;
  stripe_price_id_annual: string;
  label: string;
  description: string;
}

// High Value Industries - these get HV pricing tier
export const HIGH_VALUE_INDUSTRIES = [
  // Legal Services
  'Legal Services',
  'Bankruptcy Law',
  'Business Law',
  'Contract Law',
  'Corporate Law',
  'Criminal Defense',
  'Employment Law',
  'Estate Law',
  'Family Law',
  'Immigration Law',
  'Intellectual Property Law',
  'Medical Malpractice Law',
  'Patent Law',
  'Personal Injury Law',
  'Real Estate Law',
  'Tax Law',
  'Trademark Law',
  
  // Financial Services
  'Insurance',
  'Insurance Broker',
  'Life Insurance',
  'Health Insurance',
  'Credit Repair',
  'Credit Repair Services',
  'Credit Restoration',
  'Financial Planning',
  'Investment Advisory',
  'Wealth Management',
  'Loan Brokers',
  'Mortgage Brokers',
  'Estate Planning',
  'Accounting',
  'Tax Preparation',
  'CPA Services',
  'Tax Services',
  'Tax Relief',
  'Tax Accountant',
  
  // Real Estate
  'Real Estate',
  'Real Estate Agent',
  'Commercial Real Estate',
  'Real Estate Development',
  'Real Estate Investment',
  'Residential Real Estate',
  'Real Estate Attorney',
  
  // Medical & Dental
  'Medical & Dental',
  'Healthcare Consulting',
  'Dental Services',
];

// Subscription pricing configuration with Stripe price IDs
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  local_lv_mv: {
    key: 'local_lv_mv',
    geographic_tier: 'local',
    industry_type: 'lv_mv',
    monthly_price_cents: 1900,
    annual_price_cents: 19000,
    stripe_price_id_monthly: 'price_1ShJOkRuFpm7XGfuldUtDYCW',
    stripe_price_id_annual: 'price_1ShJOyRuFpm7XGfuBzBRR8jh',
    label: 'Local (LV/MV)',
    description: 'Local service area for low/medium value industries',
  },
  local_hv: {
    key: 'local_hv',
    geographic_tier: 'local',
    industry_type: 'hv',
    monthly_price_cents: 3900,
    annual_price_cents: 39000,
    stripe_price_id_monthly: 'price_1ShJPxRuFpm7XGfuFsl8EDpz',
    stripe_price_id_annual: 'price_1ShJQrRuFpm7XGfuzHnllY63',
    label: 'Local (HV)',
    description: 'Local service area for high value industries',
  },
  statewide_lv_mv: {
    key: 'statewide_lv_mv',
    geographic_tier: 'statewide',
    industry_type: 'lv_mv',
    monthly_price_cents: 4900,
    annual_price_cents: 49000,
    stripe_price_id_monthly: 'price_1ShJR4RuFpm7XGfuDnd5zQBW',
    stripe_price_id_annual: 'price_1ShJRFRuFpm7XGfuH23MrcKN',
    label: 'Statewide (LV/MV)',
    description: 'Statewide service area for low/medium value industries',
  },
  statewide_hv: {
    key: 'statewide_hv',
    geographic_tier: 'statewide',
    industry_type: 'hv',
    monthly_price_cents: 9900,
    annual_price_cents: 99000,
    stripe_price_id_monthly: 'price_1ShJRTRuFpm7XGfuOeU7QREH',
    stripe_price_id_annual: 'price_1ShJRhRuFpm7XGfupcbZV55Z',
    label: 'Statewide (HV)',
    description: 'Statewide service area for high value industries',
  },
  nationwide_lv_mv: {
    key: 'nationwide_lv_mv',
    geographic_tier: 'nationwide',
    industry_type: 'lv_mv',
    monthly_price_cents: 9900,
    annual_price_cents: 99000,
    stripe_price_id_monthly: 'price_1ShJRuRuFpm7XGfuD6GZfhv2',
    stripe_price_id_annual: 'price_1ShJT2RuFpm7XGfueqAqc2DP',
    label: 'Nationwide (LV/MV)',
    description: 'Nationwide service area for low/medium value industries',
  },
  nationwide_hv: {
    key: 'nationwide_hv',
    geographic_tier: 'nationwide',
    industry_type: 'hv',
    monthly_price_cents: 19900,
    annual_price_cents: 199000,
    stripe_price_id_monthly: 'price_1ShJTnRuFpm7XGfuMQPfNwDk',
    stripe_price_id_annual: 'price_1ShJU2RuFpm7XGfu9oO3NF4Y',
    label: 'Nationwide (HV)',
    description: 'Nationwide service area for high value industries',
  },
};

/**
 * Get the subscription tier key based on geographic tier and industry type
 */
export function getSubscriptionTierKey(
  geographicTier: GeographicTier,
  industryType: IndustryType
): string {
  return `${geographicTier}_${industryType}`;
}

/**
 * Get the subscription tier configuration
 */
export function getSubscriptionTier(
  geographicTier: GeographicTier,
  industryType: IndustryType
): SubscriptionTier | undefined {
  const key = getSubscriptionTierKey(geographicTier, industryType);
  return SUBSCRIPTION_TIERS[key];
}

/**
 * Determine if an industry/profession is high value
 */
export function isHighValueIndustry(profession: string): boolean {
  const normalizedProfession = profession.toLowerCase().trim();
  return HIGH_VALUE_INDUSTRIES.some(
    (industry) => industry.toLowerCase() === normalizedProfession
  );
}

/**
 * Get the industry type based on a single profession
 */
export function getIndustryType(profession: string | null): IndustryType {
  if (!profession) return 'lv_mv';
  return isHighValueIndustry(profession) ? 'hv' : 'lv_mv';
}

/**
 * Analyze multiple professions to determine if there's a mix of HV and LV/MV
 * Returns the highest tier (HV if any HV profession exists) and whether there's a mix
 */
export function analyzeProfileIndustryTypes(professions: string[]): {
  industryType: IndustryType;
  hasMixedTypes: boolean;
  hvProfessions: string[];
  lvMvProfessions: string[];
} {
  const hvProfessions: string[] = [];
  const lvMvProfessions: string[] = [];

  professions.forEach((profession) => {
    if (isHighValueIndustry(profession)) {
      hvProfessions.push(profession);
    } else {
      lvMvProfessions.push(profession);
    }
  });

  const hasMixedTypes = hvProfessions.length > 0 && lvMvProfessions.length > 0;
  // Default to HV if any HV profession exists
  const industryType: IndustryType = hvProfessions.length > 0 ? 'hv' : 'lv_mv';

  return {
    industryType,
    hasMixedTypes,
    hvProfessions,
    lvMvProfessions,
  };
}

/**
 * Format price for display (cents to dollars)
 */
export function formatSubscriptionPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/**
 * Get price ID based on tier and billing cycle
 */
export function getStripePriceId(
  geographicTier: GeographicTier,
  industryType: IndustryType,
  billingCycle: BillingCycle
): string | undefined {
  const tier = getSubscriptionTier(geographicTier, industryType);
  if (!tier) return undefined;
  
  return billingCycle === 'monthly'
    ? tier.stripe_price_id_monthly
    : tier.stripe_price_id_annual;
}

/**
 * Calculate annual savings (2 months free)
 */
export function getAnnualSavings(
  geographicTier: GeographicTier,
  industryType: IndustryType
): number {
  const tier = getSubscriptionTier(geographicTier, industryType);
  if (!tier) return 0;
  
  const monthlyYearCost = tier.monthly_price_cents * 12;
  return monthlyYearCost - tier.annual_price_cents;
}

/**
 * Get all tiers for display
 */
export function getAllTiers(): SubscriptionTier[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * Get tiers by geographic tier
 */
export function getTiersByGeographic(geographic: GeographicTier): SubscriptionTier[] {
  return Object.values(SUBSCRIPTION_TIERS).filter(
    (tier) => tier.geographic_tier === geographic
  );
}

/**
 * Geographic tier labels for display
 */
export const GEOGRAPHIC_TIER_LABELS: Record<GeographicTier, string> = {
  local: 'Local',
  statewide: 'Statewide',
  nationwide: 'Nationwide',
};

/**
 * Geographic tier descriptions
 */
export const GEOGRAPHIC_TIER_DESCRIPTIONS: Record<GeographicTier, string> = {
  local: 'Serve customers in your city or metro area',
  statewide: 'Serve customers across your entire state',
  nationwide: 'Serve customers anywhere in the country',
};

/**
 * Industry type labels for display
 */
export const INDUSTRY_TYPE_LABELS: Record<IndustryType, string> = {
  lv_mv: 'Standard Industries',
  hv: 'High-Value Industries',
};

/**
 * Price lock click threshold
 */
export const PRICE_LOCK_CLICK_THRESHOLD = 2;

/**
 * Price lock period in months
 */
export const PRICE_LOCK_PERIOD_MONTHS = 12;
