/**
 * Click & Call Pricing Configuration
 * 
 * This module handles three types of pricing:
 * 
 * 1. LEAD CONTACT REVEALS (clicking to see lead contact info)
 *    - Subscribers: 65% of Angi/Bark CPL (2 free clicks/month accumulated)
 *    - Non-subscribers: 90% of Angi/Bark CPL
 *    - 10-day grace period after subscription lapses
 * 
 * 2. PROFILE CLICKS (giggers clicking on digger profiles)
 *    - Cost: 75% of Google's average PPC for the industry
 * 
 * 3. PROFILE CALLS (giggers calling diggers)
 *    - Cost: 100% of Google's HIGH price point PPC for the industry
 */

import { GOOGLE_CPC_KEYWORDS, IndustryCpcData } from './googleCpcKeywords';
import { BARK_PRICING_DATABASE, BarkPricingData } from '@/utils/barkPricingLookup';

// =====================================================
// ANGI CPL PRICING (based on Bark as proxy)
// =====================================================

/**
 * Angi CPL tiers based on industry value
 * Using Bark pricing data as our proxy for Angi's actual CPL
 */
export const ANGI_CPL_TIERS = {
  'low-value': {
    min: 5.50,   // ~$5.50 (Bark low end)
    max: 11.00,  // ~$11 (Bark high end for low-value)
    average: 8.25,
  },
  'mid-value': {
    min: 13.20,  // ~$13 (Bark mid-value start)
    max: 19.80,  // ~$20 (Bark mid-value end)
    average: 16.50,
  },
  'high-value': {
    min: 22.00,  // ~$22 (Bark high-value start)
    max: 48.40,  // ~$48 (Bark high-value end)
    average: 35.20,
  },
} as const;

// Subscriber discount: 65% of Angi CPL
export const SUBSCRIBER_CPL_MULTIPLIER = 0.65;

// Non-subscriber rate: 90% of Angi CPL
export const NON_SUBSCRIBER_CPL_MULTIPLIER = 0.90;

// Free clicks per month for subscribers
export const FREE_CLICKS_PER_MONTH = 2;

// Grace period in days after subscription lapses
export const GRACE_PERIOD_DAYS = 10;

// =====================================================
// GOOGLE PPC PRICING FOR PROFILE CLICKS/CALLS
// =====================================================

/**
 * Profile click pricing: 75% of Google's average PPC
 */
export const PROFILE_CLICK_MULTIPLIER = 0.75;

/**
 * Profile call pricing: 100% of Google's HIGH price point PPC
 */
export const PROFILE_CALL_MULTIPLIER = 1.0;

// =====================================================
// PRICING CALCULATION FUNCTIONS
// =====================================================

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
  
  // Exact match first
  const exactMatch = BARK_PRICING_DATABASE.find(
    item => item.keyword.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Partial match
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
  
  // Check Google CPC data for category
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
  
  return 'mid-value'; // Default fallback
};

/**
 * Get Angi CPL for a specific keyword/profession
 * Uses Bark pricing as our proxy for Angi's CPL
 */
export const getAngiCplForKeyword = (keyword: string): number => {
  const barkData = getBarkPriceForKeyword(keyword);
  if (barkData) {
    return barkData.barkPrice;
  }
  
  // Fallback to category average
  const category = getIndustryCategory(keyword);
  return ANGI_CPL_TIERS[category].average;
};

/**
 * Calculate lead contact reveal pricing
 */
export const calculateLeadRevealPrice = (
  keyword: string,
  isSubscriber: boolean,
  accumulatedFreeClicks: number
): LeadPricingResult => {
  const angiCpl = getAngiCplForKeyword(keyword);
  const category = getIndustryCategory(keyword);
  
  // Check if subscriber can use a free click
  if (isSubscriber && accumulatedFreeClicks > 0) {
    return {
      costCents: 0,
      costDollars: 0,
      usedFreeClick: true,
      remainingFreeClicks: accumulatedFreeClicks - 1,
      industryCategory: category,
      baseCplDollars: angiCpl,
      discountApplied: 'Free click (subscriber benefit)',
    };
  }
  
  // Calculate cost based on subscription status
  const multiplier = isSubscriber ? SUBSCRIBER_CPL_MULTIPLIER : NON_SUBSCRIBER_CPL_MULTIPLIER;
  const costDollars = roundToNearestHalfDollar(angiCpl * multiplier);
  const costCents = Math.round(costDollars * 100);
  
  return {
    costCents,
    costDollars,
    usedFreeClick: false,
    remainingFreeClicks: accumulatedFreeClicks,
    industryCategory: category,
    baseCplDollars: angiCpl,
    discountApplied: isSubscriber 
      ? `Subscriber rate (${Math.round(SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL)` 
      : `Non-subscriber rate (${Math.round(NON_SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL)`,
  };
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
    // Check for exact keyword match
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
    
    // Check for partial keyword match
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
    
    // Check for industry name match
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
 * Calculate profile click pricing (75% of Google avg PPC)
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
  
  // Fallback to category-based pricing
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
 * Calculate profile call pricing (100% of Google high PPC)
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
  
  // Fallback to category-based pricing
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
    leadPricing: {
      subscriberDiscount: `${Math.round(SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL`,
      nonSubscriberRate: `${Math.round(NON_SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL`,
      freeClicksPerMonth: FREE_CLICKS_PER_MONTH,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      tiers: {
        'low-value': {
          subscriberRange: `$${(ANGI_CPL_TIERS['low-value'].min * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['low-value'].max * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
          nonSubscriberRange: `$${(ANGI_CPL_TIERS['low-value'].min * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['low-value'].max * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
        },
        'mid-value': {
          subscriberRange: `$${(ANGI_CPL_TIERS['mid-value'].min * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['mid-value'].max * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
          nonSubscriberRange: `$${(ANGI_CPL_TIERS['mid-value'].min * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['mid-value'].max * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
        },
        'high-value': {
          subscriberRange: `$${(ANGI_CPL_TIERS['high-value'].min * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['high-value'].max * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
          nonSubscriberRange: `$${(ANGI_CPL_TIERS['high-value'].min * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)} - $${(ANGI_CPL_TIERS['high-value'].max * NON_SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}`,
        },
      },
    },
    profilePricing: {
      clickRate: `${Math.round(PROFILE_CLICK_MULTIPLIER * 100)}% of Google avg PPC`,
      callRate: `${Math.round(PROFILE_CALL_MULTIPLIER * 100)}% of Google high PPC`,
    },
  };
};
