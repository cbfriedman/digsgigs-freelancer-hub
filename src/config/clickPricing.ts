/**
 * Click & Call Pricing Configuration
 * 
 * This module handles pricing for:
 * 
 * 1. LEAD REVEAL PRICING (Digger → Gigger)
 *    - Unconfirmed leads: Base CPL × Geographic Multiplier
 *    - Confirmed leads: +50% premium on unconfirmed prices
 *    - Subscribers: 2 free leads/month (accumulating)
 * 
 * 2. PROFILE DISCOVERY PRICING (Gigger → Digger)
 *    - Digger pays when Gigger clicks to reveal contact info
 *    - Fixed pricing based on geographic tier and industry type
 */

import { GOOGLE_CPC_KEYWORDS, IndustryCpcData } from './googleCpcKeywords';
import { BARK_PRICING_DATABASE, BarkPricingData } from '@/utils/barkPricingLookup';

// =====================================================
// GEOGRAPHIC MULTIPLIERS
// =====================================================

export const GEOGRAPHIC_MULTIPLIERS = {
  local: 1,      // ≤50 miles
  statewide: 2,  // >50 miles
  nationwide: 3,
} as const;

export type GeographicCoverage = keyof typeof GEOGRAPHIC_MULTIPLIERS;

// =====================================================
// LEAD REVEAL PRICING (Digger → Gigger)
// =====================================================

/**
 * Base CPL for unconfirmed leads by industry type
 * Standard = Low-Value + Mid-Value combined average
 */
export const BASE_CPL = {
  standard: 16.50,   // LV + MV average
  highValue: 35.20,  // HV average
} as const;

/**
 * Confirmed lead multiplier (50% premium)
 */
export const CONFIRMED_LEAD_MULTIPLIER = 1.50;

/**
 * Complete Lead Reveal Pricing Matrix
 */
export const LEAD_REVEAL_PRICING = {
  standard: {
    unconfirmed: {
      local: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.local,         // $16.50
      statewide: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.statewide, // $33.00
      nationwide: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.nationwide, // $49.50
    },
    confirmed: {
      local: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.local * CONFIRMED_LEAD_MULTIPLIER,         // $24.75
      statewide: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.statewide * CONFIRMED_LEAD_MULTIPLIER, // $49.50
      nationwide: BASE_CPL.standard * GEOGRAPHIC_MULTIPLIERS.nationwide * CONFIRMED_LEAD_MULTIPLIER, // $74.25
    },
  },
  highValue: {
    unconfirmed: {
      local: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.local,         // $35.20
      statewide: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.statewide, // $70.40
      nationwide: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.nationwide, // $105.60
    },
    confirmed: {
      local: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.local * CONFIRMED_LEAD_MULTIPLIER,         // $52.80
      statewide: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.statewide * CONFIRMED_LEAD_MULTIPLIER, // $105.60
      nationwide: BASE_CPL.highValue * GEOGRAPHIC_MULTIPLIERS.nationwide * CONFIRMED_LEAD_MULTIPLIER, // $158.40
    },
  },
} as const;

// Subscriber benefit: 2 free leads per month (accumulating)
export const FREE_LEADS_PER_MONTH = 2;

// Grace period in days after subscription lapses
export const GRACE_PERIOD_DAYS = 10;

// =====================================================
// PROFILE DISCOVERY PRICING (Gigger → Digger)
// =====================================================

/**
 * Base Profile Discovery costs by industry type
 */
export const PROFILE_DISCOVERY_BASE = {
  standard: 85.00,
  highValue: 170.00,
} as const;

/**
 * Complete Profile Discovery Pricing Matrix
 * Digger pays when Gigger clicks to reveal contact info
 */
export const PROFILE_DISCOVERY_PRICING = {
  standard: {
    local: PROFILE_DISCOVERY_BASE.standard * GEOGRAPHIC_MULTIPLIERS.local,         // $85.00
    statewide: PROFILE_DISCOVERY_BASE.standard * GEOGRAPHIC_MULTIPLIERS.statewide, // $170.00
    nationwide: PROFILE_DISCOVERY_BASE.standard * GEOGRAPHIC_MULTIPLIERS.nationwide, // $255.00
  },
  highValue: {
    local: PROFILE_DISCOVERY_BASE.highValue * GEOGRAPHIC_MULTIPLIERS.local,         // $170.00
    statewide: PROFILE_DISCOVERY_BASE.highValue * GEOGRAPHIC_MULTIPLIERS.statewide, // $340.00
    nationwide: PROFILE_DISCOVERY_BASE.highValue * GEOGRAPHIC_MULTIPLIERS.nationwide, // $510.00
  },
} as const;

// =====================================================
// HIGH-VALUE INDUSTRY DETECTION
// =====================================================

export const HIGH_VALUE_KEYWORDS = [
  'lawyer', 'attorney', 'law', 'legal',
  'insurance', 'mortgage', 'credit repair',
  'tax', 'financial', 'wealth', 'investment',
  'dental', 'dentist', 'medical', 'doctor', 'physician',
  'cpa', 'accounting', 'accountant',
  'real estate', 'realtor',
  'solar', 'roofing', 'hvac',
];

/**
 * Determine if an industry/keyword is high-value
 */
export const isHighValueIndustry = (keyword: string): boolean => {
  const normalized = keyword.toLowerCase().trim();
  return HIGH_VALUE_KEYWORDS.some(hv => 
    normalized.includes(hv) || hv.includes(normalized)
  );
};

/**
 * Get industry type from keyword
 */
export const getIndustryType = (keyword: string): 'standard' | 'highValue' => {
  return isHighValueIndustry(keyword) ? 'highValue' : 'standard';
};

// =====================================================
// PRICING CALCULATION FUNCTIONS
// =====================================================

export interface LeadRevealPricingResult {
  costCents: number;
  costDollars: number;
  usedFreeLead: boolean;
  remainingFreeLeads: number;
  isConfirmed: boolean;
  geographicCoverage: GeographicCoverage;
  industryType: 'standard' | 'highValue';
}

export interface ProfileDiscoveryPricingResult {
  costCents: number;
  costDollars: number;
  geographicCoverage: GeographicCoverage;
  industryType: 'standard' | 'highValue';
}

/**
 * Calculate lead reveal price for a Digger viewing a Gigger's contact info
 */
export const calculateLeadRevealPrice = (
  keyword: string,
  geographicCoverage: GeographicCoverage,
  isConfirmed: boolean,
  accumulatedFreeLeads: number,
  isSubscriber: boolean
): LeadRevealPricingResult => {
  const industryType = getIndustryType(keyword);
  
  // Check if subscriber can use a free lead
  if (isSubscriber && accumulatedFreeLeads > 0) {
    return {
      costCents: 0,
      costDollars: 0,
      usedFreeLead: true,
      remainingFreeLeads: accumulatedFreeLeads - 1,
      isConfirmed,
      geographicCoverage,
      industryType,
    };
  }
  
  // Get price from matrix
  const priceType = isConfirmed ? 'confirmed' : 'unconfirmed';
  const costDollars = LEAD_REVEAL_PRICING[industryType][priceType][geographicCoverage];
  const costCents = Math.round(costDollars * 100);
  
  return {
    costCents,
    costDollars,
    usedFreeLead: false,
    remainingFreeLeads: accumulatedFreeLeads,
    isConfirmed,
    geographicCoverage,
    industryType,
  };
};

/**
 * Calculate profile discovery price for a Digger when Gigger views their contact info
 */
export const calculateProfileDiscoveryPrice = (
  keyword: string,
  geographicCoverage: GeographicCoverage
): ProfileDiscoveryPricingResult => {
  const industryType = getIndustryType(keyword);
  const costDollars = PROFILE_DISCOVERY_PRICING[industryType][geographicCoverage];
  const costCents = Math.round(costDollars * 100);
  
  return {
    costCents,
    costDollars,
    geographicCoverage,
    industryType,
  };
};

// =====================================================
// LEGACY COMPATIBILITY (for gradual migration)
// =====================================================

// Keep old exports for backward compatibility
export const ANGI_CPL_TIERS = {
  'low-value': { min: 5.50, max: 11.00, average: 8.25 },
  'mid-value': { min: 13.20, max: 19.80, average: 16.50 },
  'high-value': { min: 22.00, max: 48.40, average: 35.20 },
} as const;

export const SUBSCRIBER_CPL_MULTIPLIER = 0.65;
export const NON_SUBSCRIBER_CPL_MULTIPLIER = 0.90;
export const FREE_CLICKS_PER_MONTH = FREE_LEADS_PER_MONTH;
export const PROFILE_CLICK_MULTIPLIER = 0.75;
export const PROFILE_CALL_MULTIPLIER = 1.0;

// Legacy interfaces
export interface LeadPricingResult {
  costCents: number;
  costDollars: number;
  usedFreeClick: boolean;
  remainingFreeClicks: number;
  industryCategory: 'low-value' | 'mid-value' | 'high-value';
  baseCplDollars: number;
  discountApplied: string;
}

export interface ProfileClickPricingResult {
  costCents: number;
  costDollars: number;
  googleAvgCpcCents: number;
  googleAvgCpcDollars: number;
  keywordMatched: string | null;
  industryMatched: string | null;
}

export interface ProfileCallPricingResult {
  costCents: number;
  costDollars: number;
  googleHighCpcCents: number;
  googleHighCpcDollars: number;
  keywordMatched: string | null;
  industryMatched: string | null;
}

/**
 * Look up Bark pricing for a keyword/profession
 */
export const getBarkPriceForKeyword = (keyword: string): BarkPricingData | null => {
  const normalized = keyword.toLowerCase().trim();
  
  const exactMatch = BARK_PRICING_DATABASE.find(
    item => item.keyword.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;
  
  const partialMatch = BARK_PRICING_DATABASE.find(
    item => item.keyword.toLowerCase().includes(normalized) ||
            normalized.includes(item.keyword.toLowerCase())
  );
  return partialMatch || null;
};

/**
 * Get industry category from keyword or profession
 */
export const getIndustryCategory = (keyword: string): 'low-value' | 'mid-value' | 'high-value' => {
  const barkData = getBarkPriceForKeyword(keyword);
  if (barkData) {
    return barkData.valueIndicator;
  }
  
  const normalizedKeyword = keyword.toLowerCase().trim();
  for (const industry of GOOGLE_CPC_KEYWORDS) {
    const hasKeyword = industry.keywords.some(
      kw => kw.keyword.toLowerCase().includes(normalizedKeyword) ||
            normalizedKeyword.includes(kw.keyword.toLowerCase())
    );
    if (hasKeyword) {
      return industry.category;
    }
    if (industry.industry.toLowerCase().includes(normalizedKeyword)) {
      return industry.category;
    }
  }
  
  return 'mid-value';
};

/**
 * Get Angi CPL for a specific keyword/profession
 */
export const getAngiCplForKeyword = (keyword: string): number => {
  const barkData = getBarkPriceForKeyword(keyword);
  if (barkData) {
    return barkData.barkPrice;
  }
  
  const category = getIndustryCategory(keyword);
  return ANGI_CPL_TIERS[category].average;
};

/**
 * Get Google CPC data for a keyword
 */
export const getGoogleCpcData = (keyword: string): {
  avgCpc: number;
  highCpc: number;
  industry: string;
  keyword: string | null;
} | null => {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  for (const industry of GOOGLE_CPC_KEYWORDS) {
    const matchedKeyword = industry.keywords.find(
      kw => kw.keyword.toLowerCase() === normalizedKeyword
    );
    if (matchedKeyword) {
      const highestCpc = Math.max(...industry.keywords.map(k => k.cpc));
      return {
        avgCpc: industry.averageCpc,
        highCpc: highestCpc,
        industry: industry.industry,
        keyword: matchedKeyword.keyword,
      };
    }
    
    const partialMatch = industry.keywords.find(
      kw => kw.keyword.toLowerCase().includes(normalizedKeyword) ||
            normalizedKeyword.includes(kw.keyword.toLowerCase())
    );
    if (partialMatch) {
      const highestCpc = Math.max(...industry.keywords.map(k => k.cpc));
      return {
        avgCpc: industry.averageCpc,
        highCpc: highestCpc,
        industry: industry.industry,
        keyword: partialMatch.keyword,
      };
    }
    
    if (industry.industry.toLowerCase().includes(normalizedKeyword) ||
        normalizedKeyword.includes(industry.industry.toLowerCase())) {
      const highestCpc = Math.max(...industry.keywords.map(k => k.cpc));
      return {
        avgCpc: industry.averageCpc,
        highCpc: highestCpc,
        industry: industry.industry,
        keyword: null,
      };
    }
  }
  
  return null;
};

/**
 * Get default CPC by industry category (fallback)
 */
export const getDefaultCpcByCategory = (category: 'low-value' | 'mid-value' | 'high-value'): {
  avgCpc: number;
  highCpc: number;
} => {
  switch (category) {
    case 'low-value':
      return { avgCpc: 15, highCpc: 35 };
    case 'mid-value':
      return { avgCpc: 45, highCpc: 85 };
    case 'high-value':
      return { avgCpc: 150, highCpc: 450 };
    default:
      return { avgCpc: 45, highCpc: 85 };
  }
};

/**
 * Calculate profile click pricing (legacy - now uses Profile Discovery pricing)
 */
export const calculateProfileClickPrice = (
  professionOrKeyword: string
): ProfileClickPricingResult => {
  const cpcData = getGoogleCpcData(professionOrKeyword);
  
  if (cpcData) {
    const costDollars = roundToNearestHalfDollar(cpcData.avgCpc * PROFILE_CLICK_MULTIPLIER);
    const costCents = Math.round(costDollars * 100);
    
    return {
      costCents,
      costDollars,
      googleAvgCpcCents: Math.round(cpcData.avgCpc * 100),
      googleAvgCpcDollars: cpcData.avgCpc,
      keywordMatched: cpcData.keyword,
      industryMatched: cpcData.industry,
    };
  }
  
  const category = getIndustryCategory(professionOrKeyword);
  const defaultCpc = getDefaultCpcByCategory(category);
  const costDollars = roundToNearestHalfDollar(defaultCpc.avgCpc * PROFILE_CLICK_MULTIPLIER);
  const costCents = Math.round(costDollars * 100);
  
  return {
    costCents,
    costDollars,
    googleAvgCpcCents: Math.round(defaultCpc.avgCpc * 100),
    googleAvgCpcDollars: defaultCpc.avgCpc,
    keywordMatched: null,
    industryMatched: category,
  };
};

/**
 * Calculate profile call pricing (legacy)
 */
export const calculateProfileCallPrice = (
  professionOrKeyword: string
): ProfileCallPricingResult => {
  const cpcData = getGoogleCpcData(professionOrKeyword);
  
  if (cpcData) {
    const costDollars = roundToNearestHalfDollar(cpcData.highCpc * PROFILE_CALL_MULTIPLIER);
    const costCents = Math.round(costDollars * 100);
    
    return {
      costCents,
      costDollars,
      googleHighCpcCents: Math.round(cpcData.highCpc * 100),
      googleHighCpcDollars: cpcData.highCpc,
      keywordMatched: cpcData.keyword,
      industryMatched: cpcData.industry,
    };
  }
  
  const category = getIndustryCategory(professionOrKeyword);
  const defaultCpc = getDefaultCpcByCategory(category);
  const costDollars = roundToNearestHalfDollar(defaultCpc.highCpc * PROFILE_CALL_MULTIPLIER);
  const costCents = Math.round(costDollars * 100);
  
  return {
    costCents,
    costDollars,
    googleHighCpcCents: Math.round(defaultCpc.highCpc * 100),
    googleHighCpcDollars: defaultCpc.highCpc,
    keywordMatched: null,
    industryMatched: category,
  };
};

/**
 * Round to nearest $0.50 or whole dollar
 */
export const roundToNearestHalfDollar = (amount: number): number => {
  return Math.ceil(amount * 2) / 2;
};

// =====================================================
// PRICING SUMMARY HELPERS
// =====================================================

/**
 * Get a pricing summary for display purposes
 */
export const getPricingSummary = () => {
  return {
    leadReveal: {
      standard: LEAD_REVEAL_PRICING.standard,
      highValue: LEAD_REVEAL_PRICING.highValue,
      freeLeadsPerMonth: FREE_LEADS_PER_MONTH,
      confirmedPremium: '50%',
    },
    profileDiscovery: {
      standard: PROFILE_DISCOVERY_PRICING.standard,
      highValue: PROFILE_DISCOVERY_PRICING.highValue,
    },
    geographicMultipliers: GEOGRAPHIC_MULTIPLIERS,
  };
};
