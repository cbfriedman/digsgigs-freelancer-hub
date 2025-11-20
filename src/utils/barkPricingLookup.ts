/**
 * Bark.com Pricing Lookup Utility
 * 
 * This utility provides Bark.com lead pricing data for different professions/keywords.
 * Bark uses a credit system where 1 credit = $2.20 USD.
 * 
 * DigsandGigs pricing strategy based on Bark:
 * - Premium tier (51+ leads/month): Bark price - $0.50
 * - Pro tier (11-50 leads/month): Bark price + 50% (1.5x)
 * - Standard tier (1-10 leads/month): Bark price + 100% (2x)
 * 
 * These values should be updated quarterly based on competitive market analysis.
 */

interface BarkPricingData {
  keyword: string;
  barkCredits: number; // Bark's credit cost (1 credit = $2.20)
  barkPrice: number; // in dollars (credits * $2.20)
  category: string;
  valueIndicator: 'low-value' | 'mid-value' | 'high-value';
}

// Comprehensive Bark pricing database
// Values based on research of Bark.com's actual lead prices
export const BARK_PRICING_DATABASE: BarkPricingData[] = [
  // High-value professions (Bark: $15-$50+ per lead)
  { keyword: "personal injury lawyer", barkCredits: 20, barkPrice: 44.00, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "mesothelioma lawyer", barkCredits: 22, barkPrice: 48.40, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "car accident lawyer", barkCredits: 18, barkPrice: 39.60, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "criminal defense attorney", barkCredits: 16, barkPrice: 35.20, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "dui attorney", barkCredits: 15, barkPrice: 33.00, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "bankruptcy lawyer", barkCredits: 14, barkPrice: 30.80, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "divorce lawyer", barkCredits: 13, barkPrice: 28.60, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "real estate lawyer", barkCredits: 12, barkPrice: 26.40, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "patent attorney", barkCredits: 14, barkPrice: 30.80, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "immigration lawyer", barkCredits: 12, barkPrice: 26.40, category: "Legal Services", valueIndicator: "high-value" },
  
  { keyword: "life insurance", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "auto insurance", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "health insurance", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "home insurance", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "business insurance", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  
  { keyword: "mortgage broker", barkCredits: 12.5, barkPrice: 27.50, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "refinance mortgage", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "home loan", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "loan broker", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  
  { keyword: "financial advisor", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "investment advisor", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "wealth management", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "cpa", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax attorney", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "accounting", barkCredits: 9, barkPrice: 19.80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax preparation", barkCredits: 8, barkPrice: 17.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "bookkeeping", barkCredits: 7, barkPrice: 15.40, category: "Financial Services", valueIndicator: "mid-value" },
  
  { keyword: "commercial real estate", barkCredits: 12, barkPrice: 26.40, category: "Real Estate", valueIndicator: "high-value" },
  { keyword: "real estate agent", barkCredits: 10, barkPrice: 22.00, category: "Real Estate", valueIndicator: "high-value" },
  { keyword: "homes for sale", barkCredits: 10, barkPrice: 22.00, category: "Real Estate", valueIndicator: "high-value" },
  
  { keyword: "dental implants", barkCredits: 11, barkPrice: 24.20, category: "Health & Wellness", valueIndicator: "high-value" },
  { keyword: "cosmetic dentist", barkCredits: 10, barkPrice: 22.00, category: "Health & Wellness", valueIndicator: "high-value" },
  { keyword: "orthodontist", barkCredits: 10, barkPrice: 22.00, category: "Health & Wellness", valueIndicator: "high-value" },
  
  { keyword: "software development", barkCredits: 11, barkPrice: 24.20, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "custom software development", barkCredits: 12, barkPrice: 26.40, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "mobile app development", barkCredits: 10, barkPrice: 22.00, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "blockchain developer", barkCredits: 13, barkPrice: 28.60, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "cybersecurity consultant", barkCredits: 11, barkPrice: 24.20, category: "IT & Software Development", valueIndicator: "high-value" },
  
  { keyword: "architect", barkCredits: 10, barkPrice: 22.00, category: "Architecture & Engineering", valueIndicator: "high-value" },
  { keyword: "structural engineer", barkCredits: 11, barkPrice: 24.20, category: "Architecture & Engineering", valueIndicator: "high-value" },
  { keyword: "civil engineer", barkCredits: 10, barkPrice: 22.00, category: "Architecture & Engineering", valueIndicator: "high-value" },
  
  { keyword: "management consultant", barkCredits: 10, barkPrice: 22.00, category: "Business & Consulting", valueIndicator: "high-value" },
  { keyword: "strategy consultant", barkCredits: 11, barkPrice: 24.20, category: "Business & Consulting", valueIndicator: "high-value" },
  { keyword: "business consultant", barkCredits: 9, barkPrice: 19.80, category: "Business & Consulting", valueIndicator: "high-value" },
  
  // Mid-value professions (Bark: $7-$20 per lead)
  { keyword: "plumber", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "plumbing service", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "emergency plumber", barkCredits: 9, barkPrice: 19.80, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "hvac", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "hvac repair", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "air conditioning repair", barkCredits: 7.5, barkPrice: 16.50, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "electrician", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "electrical contractor", barkCredits: 8.5, barkPrice: 18.70, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "roofing contractor", barkCredits: 9, barkPrice: 19.80, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "roof repair", barkCredits: 8.5, barkPrice: 18.70, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "general contractor", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "home remodeling", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "kitchen remodeling", barkCredits: 8.5, barkPrice: 18.70, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "bathroom remodeling", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "pest control", barkCredits: 6, barkPrice: 13.20, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "termite control", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "tree service", barkCredits: 6, barkPrice: 13.20, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "tree removal", barkCredits: 7, barkPrice: 15.40, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "landscaping", barkCredits: 5.5, barkPrice: 12.10, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "landscape design", barkCredits: 6, barkPrice: 13.20, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  
  { keyword: "carpentry", barkCredits: 6.5, barkPrice: 14.30, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "painting", barkCredits: 5.5, barkPrice: 12.10, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "flooring", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "web development", barkCredits: 7, barkPrice: 15.40, category: "IT & Software Development", valueIndicator: "mid-value" },
  { keyword: "web design", barkCredits: 6.5, barkPrice: 14.30, category: "IT & Software Development", valueIndicator: "mid-value" },
  { keyword: "graphic design", barkCredits: 5, barkPrice: 11.00, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "logo design", barkCredits: 4.5, barkPrice: 9.90, category: "Creative & Design", valueIndicator: "mid-value" },
  
  { keyword: "photography", barkCredits: 6, barkPrice: 13.20, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "wedding photography", barkCredits: 7, barkPrice: 15.40, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "video production", barkCredits: 7, barkPrice: 15.40, category: "Creative & Design", valueIndicator: "mid-value" },
  
  { keyword: "seo", barkCredits: 6, barkPrice: 13.20, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  { keyword: "digital marketing", barkCredits: 6.5, barkPrice: 14.30, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  { keyword: "social media marketing", barkCredits: 5.5, barkPrice: 12.10, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  
  // Low-value professions (Bark: $3-$8 per lead)
  { keyword: "house cleaning", barkCredits: 3.5, barkPrice: 7.70, category: "Home & Local Services", valueIndicator: "low-value" },
  { keyword: "carpet cleaning", barkCredits: 4, barkPrice: 8.80, category: "Home & Local Services", valueIndicator: "low-value" },
  { keyword: "handyman", barkCredits: 4, barkPrice: 8.80, category: "Home & Local Services", valueIndicator: "low-value" },
  { keyword: "pet sitting", barkCredits: 3, barkPrice: 6.60, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "dog walking", barkCredits: 2.5, barkPrice: 5.50, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "pet grooming", barkCredits: 3.5, barkPrice: 7.70, category: "Personal Services", valueIndicator: "low-value" },
  
  { keyword: "lawn care", barkCredits: 3.5, barkPrice: 7.70, category: "Landscaping & Outdoor", valueIndicator: "low-value" },
  { keyword: "lawn mowing", barkCredits: 3, barkPrice: 6.60, category: "Landscaping & Outdoor", valueIndicator: "low-value" },
  { keyword: "snow removal", barkCredits: 3.5, barkPrice: 7.70, category: "Home & Local Services", valueIndicator: "low-value" },
  { keyword: "pressure washing", barkCredits: 3.5, barkPrice: 7.70, category: "Home & Local Services", valueIndicator: "low-value" },
  
  { keyword: "tutoring", barkCredits: 4, barkPrice: 8.80, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "personal training", barkCredits: 4.5, barkPrice: 9.90, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "massage therapy", barkCredits: 4.5, barkPrice: 9.90, category: "Personal Services", valueIndicator: "low-value" },
  
  { keyword: "moving services", barkCredits: 5, barkPrice: 11.00, category: "Home & Local Services", valueIndicator: "low-value" },
  { keyword: "event planning", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "catering", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "low-value" },
  
  { keyword: "content writing", barkCredits: 3.5, barkPrice: 7.70, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "copywriting", barkCredits: 4, barkPrice: 8.80, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "blog writing", barkCredits: 3, barkPrice: 6.60, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "data entry", barkCredits: 2.5, barkPrice: 5.50, category: "IT & Software Development", valueIndicator: "low-value" },
  { keyword: "virtual assistant", barkCredits: 3, barkPrice: 6.60, category: "Business & Consulting", valueIndicator: "low-value" },
  { keyword: "transcription", barkCredits: 2.5, barkPrice: 5.50, category: "Creative & Design", valueIndicator: "low-value" },
  
  { keyword: "social media management", barkCredits: 4, barkPrice: 8.80, category: "Marketing & Advertising", valueIndicator: "low-value" },
  { keyword: "email marketing", barkCredits: 3.5, barkPrice: 7.70, category: "Marketing & Advertising", valueIndicator: "low-value" },
];

/**
 * Lookup Bark pricing for a specific keyword
 * Returns null if not found in database
 */
export function lookupBarkPrice(keyword: string): BarkPricingData | null {
  const normalizedKeyword = keyword.toLowerCase().trim();
  return BARK_PRICING_DATABASE.find(
    entry => entry.keyword.toLowerCase() === normalizedKeyword
  ) || null;
}

/**
 * Calculate DigsandGigs CPL from Bark pricing
 * - Premium (51+ leads): Bark - $0.50
 * - Pro (11-50 leads): Bark * 1.5
 * - Standard (1-10 leads): Bark * 2
 */
export function calculateCPLFromBark(barkPrice: number, tier: 'free' | 'pro' | 'premium'): number {
  switch (tier) {
    case 'premium':
      return Math.max(1, barkPrice - 0.50); // Minimum $1
    case 'pro':
      return barkPrice * 1.5;
    case 'free':
    default:
      return barkPrice * 2;
  }
}

/**
 * Find similar keywords in the Bark database
 */
export function findSimilarBarkKeywords(searchTerm: string, limit: number = 5): BarkPricingData[] {
  const normalizedTerm = searchTerm.toLowerCase().trim();
  return BARK_PRICING_DATABASE
    .filter(entry => entry.keyword.toLowerCase().includes(normalizedTerm))
    .slice(0, limit);
}

/**
 * Get all keywords in a specific category
 */
export function getBarkKeywordsByCategory(category: string): BarkPricingData[] {
  return BARK_PRICING_DATABASE.filter(entry => entry.category === category);
}

/**
 * Get average Bark price for a category
 */
export function getAverageBarkPriceForCategory(category: string): number {
  const entries = getBarkKeywordsByCategory(category);
  if (entries.length === 0) return 0;
  
  const sum = entries.reduce((acc, entry) => acc + entry.barkPrice, 0);
  return sum / entries.length;
}

/**
 * Determine value tier from Bark price
 */
export function determineValueTierFromBarkPrice(barkPrice: number): 'low-value' | 'mid-value' | 'high-value' {
  if (barkPrice <= 11) return 'low-value';
  if (barkPrice <= 20) return 'mid-value';
  return 'high-value';
}
