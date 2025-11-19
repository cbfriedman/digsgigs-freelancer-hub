/**
 * CPC (Cost Per Click) Lookup Utility
 * 
 * This utility provides estimated Google AdWords CPC values for different professions/keywords.
 * These values are used to calculate Cost Per Lead (CPL) using the following multipliers:
 * - Free tier: 3x CPC
 * - Pro tier: 2.5x CPC  
 * - Premium tier: 2x CPC
 * 
 * CPC values are research-based estimates and should be updated quarterly based on actual market data.
 */

interface CPCData {
  keyword: string;
  estimatedCPC: number; // in dollars
  category: string;
  valueIndicator: 'low-value' | 'mid-value' | 'high-value';
}

// Comprehensive CPC database - values are estimated averages based on industry research
export const CPC_DATABASE: CPCData[] = [
  // High-value professions ($50-$200+ CPC)
  { keyword: "personal injury lawyer", estimatedCPC: 150, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "mesothelioma lawyer", estimatedCPC: 200, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "car accident lawyer", estimatedCPC: 120, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "criminal defense attorney", estimatedCPC: 90, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "dui attorney", estimatedCPC: 85, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "bankruptcy lawyer", estimatedCPC: 70, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "divorce lawyer", estimatedCPC: 65, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "real estate lawyer", estimatedCPC: 60, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "patent attorney", estimatedCPC: 75, category: "Legal Services", valueIndicator: "high-value" },
  { keyword: "immigration lawyer", estimatedCPC: 55, category: "Legal Services", valueIndicator: "high-value" },
  
  { keyword: "life insurance", estimatedCPC: 80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "auto insurance", estimatedCPC: 75, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "health insurance", estimatedCPC: 70, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "home insurance", estimatedCPC: 65, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "business insurance", estimatedCPC: 60, category: "Financial Services", valueIndicator: "high-value" },
  
  { keyword: "mortgage broker", estimatedCPC: 95, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "refinance mortgage", estimatedCPC: 85, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "home loan", estimatedCPC: 75, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "loan broker", estimatedCPC: 70, category: "Financial Services", valueIndicator: "high-value" },
  
  { keyword: "financial advisor", estimatedCPC: 65, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "investment advisor", estimatedCPC: 60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "wealth management", estimatedCPC: 70, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "cpa", estimatedCPC: 55, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax attorney", estimatedCPC: 60, category: "Financial Services", valueIndicator: "high-value" },
  
  { keyword: "commercial real estate", estimatedCPC: 65, category: "Real Estate", valueIndicator: "high-value" },
  { keyword: "real estate agent", estimatedCPC: 55, category: "Real Estate", valueIndicator: "high-value" },
  { keyword: "homes for sale", estimatedCPC: 50, category: "Real Estate", valueIndicator: "high-value" },
  
  { keyword: "dental implants", estimatedCPC: 60, category: "Health & Wellness", valueIndicator: "high-value" },
  { keyword: "cosmetic dentist", estimatedCPC: 55, category: "Health & Wellness", valueIndicator: "high-value" },
  { keyword: "orthodontist", estimatedCPC: 50, category: "Health & Wellness", valueIndicator: "high-value" },
  
  { keyword: "software development", estimatedCPC: 65, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "custom software development", estimatedCPC: 70, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "mobile app development", estimatedCPC: 60, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "blockchain developer", estimatedCPC: 75, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "cybersecurity consultant", estimatedCPC: 65, category: "IT & Software Development", valueIndicator: "high-value" },
  
  { keyword: "architect", estimatedCPC: 55, category: "Architecture & Engineering", valueIndicator: "high-value" },
  { keyword: "structural engineer", estimatedCPC: 60, category: "Architecture & Engineering", valueIndicator: "high-value" },
  { keyword: "civil engineer", estimatedCPC: 55, category: "Architecture & Engineering", valueIndicator: "high-value" },
  
  { keyword: "management consultant", estimatedCPC: 60, category: "Business & Consulting", valueIndicator: "high-value" },
  { keyword: "strategy consultant", estimatedCPC: 65, category: "Business & Consulting", valueIndicator: "high-value" },
  { keyword: "business consultant", estimatedCPC: 55, category: "Business & Consulting", valueIndicator: "high-value" },
  
  // Mid-value professions ($15-$50 CPC)
  { keyword: "plumber", estimatedCPC: 35, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "plumbing service", estimatedCPC: 32, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "emergency plumber", estimatedCPC: 40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "hvac", estimatedCPC: 38, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "hvac repair", estimatedCPC: 35, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "air conditioning repair", estimatedCPC: 33, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "electrician", estimatedCPC: 34, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "electrical contractor", estimatedCPC: 36, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "roofing contractor", estimatedCPC: 40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "roof repair", estimatedCPC: 38, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "general contractor", estimatedCPC: 35, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "home remodeling", estimatedCPC: 33, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "kitchen remodeling", estimatedCPC: 36, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "bathroom remodeling", estimatedCPC: 34, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "pest control", estimatedCPC: 25, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "termite control", estimatedCPC: 28, category: "Construction & Home Services", valueIndicator: "mid-value" },
  
  { keyword: "tree service", estimatedCPC: 22, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "tree removal", estimatedCPC: 24, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "landscaping", estimatedCPC: 20, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  { keyword: "landscape design", estimatedCPC: 23, category: "Landscaping & Outdoor", valueIndicator: "mid-value" },
  
  { keyword: "web developer", estimatedCPC: 30, category: "IT & Software Development", valueIndicator: "mid-value" },
  { keyword: "web design", estimatedCPC: 28, category: "IT & Software Development", valueIndicator: "mid-value" },
  { keyword: "ecommerce website", estimatedCPC: 32, category: "IT & Software Development", valueIndicator: "mid-value" },
  
  { keyword: "seo services", estimatedCPC: 35, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  { keyword: "digital marketing", estimatedCPC: 30, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  { keyword: "ppc management", estimatedCPC: 28, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  { keyword: "social media marketing", estimatedCPC: 25, category: "Marketing & Advertising", valueIndicator: "mid-value" },
  
  { keyword: "graphic designer", estimatedCPC: 22, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "video production", estimatedCPC: 26, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "animation services", estimatedCPC: 24, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "3d modeling", estimatedCPC: 23, category: "Creative & Design", valueIndicator: "mid-value" },
  
  { keyword: "bookkeeping", estimatedCPC: 28, category: "Financial Services", valueIndicator: "mid-value" },
  { keyword: "accounting services", estimatedCPC: 32, category: "Financial Services", valueIndicator: "mid-value" },
  
  { keyword: "event planner", estimatedCPC: 20, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "wedding planner", estimatedCPC: 24, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "catering", estimatedCPC: 18, category: "Personal Services", valueIndicator: "mid-value" },
  
  // Low-value professions ($5-$15 CPC)
  { keyword: "house cleaning", estimatedCPC: 12, category: "Construction & Home Services", valueIndicator: "low-value" },
  { keyword: "maid service", estimatedCPC: 11, category: "Construction & Home Services", valueIndicator: "low-value" },
  { keyword: "carpet cleaning", estimatedCPC: 10, category: "Construction & Home Services", valueIndicator: "low-value" },
  
  { keyword: "handyman", estimatedCPC: 13, category: "Construction & Home Services", valueIndicator: "low-value" },
  { keyword: "handyman services", estimatedCPC: 12, category: "Construction & Home Services", valueIndicator: "low-value" },
  
  { keyword: "lawn care", estimatedCPC: 10, category: "Landscaping & Outdoor", valueIndicator: "low-value" },
  { keyword: "lawn mowing", estimatedCPC: 8, category: "Landscaping & Outdoor", valueIndicator: "low-value" },
  { keyword: "pressure washing", estimatedCPC: 9, category: "Landscaping & Outdoor", valueIndicator: "low-value" },
  
  { keyword: "personal trainer", estimatedCPC: 11, category: "Health & Wellness", valueIndicator: "low-value" },
  { keyword: "fitness coach", estimatedCPC: 10, category: "Health & Wellness", valueIndicator: "low-value" },
  { keyword: "yoga instructor", estimatedCPC: 8, category: "Health & Wellness", valueIndicator: "low-value" },
  { keyword: "massage therapist", estimatedCPC: 9, category: "Health & Wellness", valueIndicator: "low-value" },
  
  { keyword: "pet grooming", estimatedCPC: 7, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "dog walker", estimatedCPC: 6, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "pet sitting", estimatedCPC: 6, category: "Personal Services", valueIndicator: "low-value" },
  
  { keyword: "logo design", estimatedCPC: 12, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "photo editing", estimatedCPC: 8, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "voice over", estimatedCPC: 9, category: "Creative & Design", valueIndicator: "low-value" },
  
  { keyword: "wordpress", estimatedCPC: 11, category: "IT & Software Development", valueIndicator: "low-value" },
  { keyword: "it support", estimatedCPC: 10, category: "IT & Software Development", valueIndicator: "low-value" },
  
  { keyword: "copywriting", estimatedCPC: 13, category: "Writing & Content", valueIndicator: "low-value" },
  { keyword: "blog writing", estimatedCPC: 10, category: "Writing & Content", valueIndicator: "low-value" },
  { keyword: "article writing", estimatedCPC: 9, category: "Writing & Content", valueIndicator: "low-value" },
  { keyword: "proofreading", estimatedCPC: 7, category: "Writing & Content", valueIndicator: "low-value" },
  
  { keyword: "data entry", estimatedCPC: 8, category: "Data & Analytics", valueIndicator: "low-value" },
  { keyword: "transcription", estimatedCPC: 7, category: "Translation & Languages", valueIndicator: "low-value" },
  
  { keyword: "social media manager", estimatedCPC: 12, category: "Marketing & Advertising", valueIndicator: "low-value" },
  { keyword: "email marketing", estimatedCPC: 11, category: "Marketing & Advertising", valueIndicator: "low-value" },
];

/**
 * Looks up CPC for a given keyword
 * Returns null if keyword not found in database
 */
export function lookupCPC(keyword: string): CPCData | null {
  const normalizedKeyword = keyword.toLowerCase().trim();
  return CPC_DATABASE.find(entry => 
    entry.keyword.toLowerCase() === normalizedKeyword
  ) || null;
}

/**
 * Calculates Cost Per Lead based on CPC and tier multiplier
 */
export function calculateCPLFromCPC(
  cpc: number,
  tier: 'free' | 'pro' | 'premium'
): number {
  const multipliers = {
    free: 3.0,
    pro: 2.5,
    premium: 2.0
  };
  
  return cpc * multipliers[tier];
}

/**
 * Finds the closest matching keyword in the database
 * Useful for partial matches or similar keywords
 */
export function findSimilarKeywords(searchTerm: string, limit: number = 5): CPCData[] {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return CPC_DATABASE
    .filter(entry => entry.keyword.includes(normalizedSearch))
    .slice(0, limit);
}

/**
 * Gets all keywords for a specific category
 */
export function getKeywordsByCategory(category: string): CPCData[] {
  return CPC_DATABASE.filter(entry => entry.category === category);
}

/**
 * Determines value tier based on CPC
 */
export function determineValueTierFromCPC(cpc: number): 'low-value' | 'mid-value' | 'high-value' {
  if (cpc >= 50) return 'high-value';
  if (cpc >= 15) return 'mid-value';
  return 'low-value';
}

/**
 * Gets average CPC for a category
 */
export function getAverageCPCForCategory(category: string): number {
  const categoryData = getKeywordsByCategory(category);
  if (categoryData.length === 0) return 0;
  
  const sum = categoryData.reduce((acc, entry) => acc + entry.estimatedCPC, 0);
  return sum / categoryData.length;
}
