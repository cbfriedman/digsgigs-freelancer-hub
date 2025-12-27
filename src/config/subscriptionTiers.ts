/**
 * Geographic Subscription Tiers Configuration
 * 
 * Pricing Model (UNIFIED - Same for Standard and High-Value):
 * - Local: $29/month - Serves a single city/metro area
 * - Statewide: $59/month (1 state) + $15/additional state, max $199/month
 * - Nationwide: $299/month - Serves the entire country
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
  monthly_price_cents: number;
  annual_price_cents: number;
  stripe_price_id_monthly: string;
  stripe_price_id_annual: string;
  label: string;
  description: string;
}

// Statewide pricing configuration
export const STATEWIDE_PRICING = {
  base_monthly_cents: 5900,           // $59 for 1 state
  additional_state_cents: 1500,       // $15 per additional state
  max_monthly_cents: 19900,           // $199 maximum per month
};

// High Value Industries - these get HV lead reveal pricing tier (but same subscription)
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
  'Bookkeeping',
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
  
  // Professional Services (Tech & Marketing)
  'Web Development',
  'Web Developer',
  'Software Development',
  'Software Developer',
  'SEO',
  'SEO Services',
  'SEO Expert',
  'PPC Management',
  'PPC Manager',
  'Google Ads Management',
  'Google Ads Manager',
  'Marketing Strategist',
  'Marketing Strategy',
  'Professional Graphic Design',
  'Brand Identity Design',
  'Professional Video Editing',
  'Video Production',
  'Business Consulting',
  'Business Consultant',
];

// Unified subscription pricing configuration (same for all industries)
export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  local: {
    key: 'local',
    geographic_tier: 'local',
    monthly_price_cents: 2900,        // $29/month
    annual_price_cents: 29000,        // $290/year (2 months free)
    stripe_price_id_monthly: 'price_local_monthly',
    stripe_price_id_annual: 'price_local_annual',
    label: 'Local',
    description: 'Serve customers in your city or metro area',
  },
  statewide: {
    key: 'statewide',
    geographic_tier: 'statewide',
    monthly_price_cents: 5900,        // $59/month (1 state)
    annual_price_cents: 59000,        // $590/year (2 months free)
    stripe_price_id_monthly: 'price_statewide_monthly',
    stripe_price_id_annual: 'price_statewide_annual',
    label: 'Statewide',
    description: '$59/mo for 1 state, +$15 per additional state (max $199/mo)',
  },
  nationwide: {
    key: 'nationwide',
    geographic_tier: 'nationwide',
    monthly_price_cents: 29900,       // $299/month
    annual_price_cents: 299000,       // $2,990/year (2 months free)
    stripe_price_id_monthly: 'price_nationwide_monthly',
    stripe_price_id_annual: 'price_nationwide_annual',
    label: 'Nationwide',
    description: 'Serve customers anywhere in the country',
  },
  // Legacy keys for backward compatibility
  local_lv_mv: {
    key: 'local_lv_mv',
    geographic_tier: 'local',
    monthly_price_cents: 2900,
    annual_price_cents: 29000,
    stripe_price_id_monthly: 'price_local_monthly',
    stripe_price_id_annual: 'price_local_annual',
    label: 'Local',
    description: 'Serve customers in your city or metro area',
  },
  local_hv: {
    key: 'local_hv',
    geographic_tier: 'local',
    monthly_price_cents: 2900,
    annual_price_cents: 29000,
    stripe_price_id_monthly: 'price_local_monthly',
    stripe_price_id_annual: 'price_local_annual',
    label: 'Local',
    description: 'Serve customers in your city or metro area',
  },
  statewide_lv_mv: {
    key: 'statewide_lv_mv',
    geographic_tier: 'statewide',
    monthly_price_cents: 5900,
    annual_price_cents: 59000,
    stripe_price_id_monthly: 'price_statewide_monthly',
    stripe_price_id_annual: 'price_statewide_annual',
    label: 'Statewide',
    description: '$59/mo for 1 state, +$15 per additional state (max $199/mo)',
  },
  statewide_hv: {
    key: 'statewide_hv',
    geographic_tier: 'statewide',
    monthly_price_cents: 5900,
    annual_price_cents: 59000,
    stripe_price_id_monthly: 'price_statewide_monthly',
    stripe_price_id_annual: 'price_statewide_annual',
    label: 'Statewide',
    description: '$59/mo for 1 state, +$15 per additional state (max $199/mo)',
  },
  nationwide_lv_mv: {
    key: 'nationwide_lv_mv',
    geographic_tier: 'nationwide',
    monthly_price_cents: 29900,
    annual_price_cents: 299000,
    stripe_price_id_monthly: 'price_nationwide_monthly',
    stripe_price_id_annual: 'price_nationwide_annual',
    label: 'Nationwide',
    description: 'Serve customers anywhere in the country',
  },
  nationwide_hv: {
    key: 'nationwide_hv',
    geographic_tier: 'nationwide',
    monthly_price_cents: 29900,
    annual_price_cents: 299000,
    stripe_price_id_monthly: 'price_nationwide_monthly',
    stripe_price_id_annual: 'price_nationwide_annual',
    label: 'Nationwide',
    description: 'Serve customers anywhere in the country',
  },
};

/**
 * Calculate statewide subscription price based on number of states
 */
export function calculateStatewidePriceMonthly(numberOfStates: number): number {
  if (numberOfStates <= 0) return 0;
  if (numberOfStates === 1) return STATEWIDE_PRICING.base_monthly_cents;
  
  const additionalCost = (numberOfStates - 1) * STATEWIDE_PRICING.additional_state_cents;
  const total = STATEWIDE_PRICING.base_monthly_cents + additionalCost;
  
  return Math.min(total, STATEWIDE_PRICING.max_monthly_cents);
}

/**
 * Get the subscription tier key (unified - no longer depends on industry type)
 */
export function getSubscriptionTierKey(
  geographicTier: GeographicTier,
  industryType?: IndustryType
): string {
  // Industry type no longer affects subscription pricing
  return geographicTier;
}

/**
 * Get the subscription tier configuration (unified pricing)
 */
export function getSubscriptionTier(
  geographicTier: GeographicTier,
  industryType?: IndustryType
): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS[geographicTier];
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
 * Get price ID based on tier and billing cycle (unified pricing)
 */
export function getStripePriceId(
  geographicTier: GeographicTier,
  industryType: IndustryType | undefined,
  billingCycle: BillingCycle
): string | undefined {
  const tier = getSubscriptionTier(geographicTier);
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
  industryType?: IndustryType
): number {
  const tier = getSubscriptionTier(geographicTier);
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
