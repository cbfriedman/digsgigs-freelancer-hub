/**
 * Bark.com Pricing Lookup Utility
 * 
 * This utility provides Bark.com lead pricing data for different professions/keywords.
 * Used as a reference for competitive pricing.
 * 
 * DigsandGigs Simplified Pricing:
 * - Standard leads: Industry-based pricing
 * - Confirmed leads: +20% premium for phone-verified contacts
 * 
 * NOTE: Exclusivity tiers have been removed. All leads are now non-exclusive.
 */

// Conversion rates by lead type
export const LEAD_CONVERSION_RATES = {
  nonExclusiveUnconfirmed: 0.05,  // 5% - standard leads
  nonExclusiveConfirmed: 0.10,    // 10% - verified leads
  /** @deprecated - exclusivity removed */
  semiExclusive: 0.20,
  /** @deprecated - exclusivity removed */
  exclusive24h: 0.50,
  barkComparison: 0.05,           // 5% - Bark's unconfirmed leads
  googleCPC: 0.07,                // 7% - Google Ads click-to-consumer
};

// Pricing multipliers (simplified)
export const BARK_PRICING_MULTIPLIERS = {
  nonExclusiveUnconfirmed: 0.90,  // 90% of Bark
  nonExclusiveConfirmed: 1.25,    // 125% of Bark (confirmed premium)
  /** @deprecated - exclusivity removed */
  semiExclusive: 2.00,
  /** @deprecated - exclusivity removed */
  exclusive24h: 4.00,
};

export interface BarkPricingData {
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
  
  // Credit Repair - High-value financial services
  { keyword: "credit repair", barkCredits: 14, barkPrice: 30.80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit repair services", barkCredits: 15, barkPrice: 33.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit repair company", barkCredits: 14, barkPrice: 30.80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit repair specialist", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit restoration", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "fix my credit", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit score repair", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "bad credit repair", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit dispute services", barkCredits: 10, barkPrice: 22.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "credit counseling", barkCredits: 9, barkPrice: 19.80, category: "Financial Services", valueIndicator: "high-value" },
  
  // Tax Relief - High-value financial services
  { keyword: "irs tax relief", barkCredits: 16, barkPrice: 35.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax debt relief", barkCredits: 15, barkPrice: 33.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax debt help", barkCredits: 14, barkPrice: 30.80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "back taxes help", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "offer in compromise", barkCredits: 15, barkPrice: 33.00, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "irs debt settlement", barkCredits: 14, barkPrice: 30.80, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax lien removal", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax levy release", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "irs payment plan", barkCredits: 11, barkPrice: 24.20, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "unfiled tax returns help", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "irs wage garnishment help", barkCredits: 13, barkPrice: 28.60, category: "Financial Services", valueIndicator: "high-value" },
  { keyword: "tax penalty abatement", barkCredits: 12, barkPrice: 26.40, category: "Financial Services", valueIndicator: "high-value" },
  
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
  { keyword: "social media manager", barkCredits: 4, barkPrice: 8.80, category: "Marketing & Advertising", valueIndicator: "low-value" },
  { keyword: "email marketing", barkCredits: 3.5, barkPrice: 7.70, category: "Marketing & Advertising", valueIndicator: "low-value" },
  { keyword: "email marketer", barkCredits: 3.5, barkPrice: 7.70, category: "Marketing & Advertising", valueIndicator: "low-value" },
  
  // ===== NEW PROFESSIONS (Added) =====
  { keyword: "customer support", barkCredits: 3, barkPrice: 6.60, category: "Business & Consulting", valueIndicator: "low-value" },
  { keyword: "customer service", barkCredits: 3, barkPrice: 6.60, category: "Business & Consulting", valueIndicator: "low-value" },
  { keyword: "business coach", barkCredits: 5, barkPrice: 11.00, category: "Business & Consulting", valueIndicator: "low-value" },
  { keyword: "business coaching", barkCredits: 5, barkPrice: 11.00, category: "Business & Consulting", valueIndicator: "low-value" },
  { keyword: "life coach", barkCredits: 4.5, barkPrice: 9.90, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "fitness coach", barkCredits: 4.5, barkPrice: 9.90, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "ai trainer", barkCredits: 3, barkPrice: 6.60, category: "IT & Software Development", valueIndicator: "low-value" },
  { keyword: "prompt writer", barkCredits: 3, barkPrice: 6.60, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "prompt engineer", barkCredits: 4, barkPrice: 8.80, category: "IT & Software Development", valueIndicator: "low-value" },
  { keyword: "podcast producer", barkCredits: 5, barkPrice: 11.00, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "podcast production", barkCredits: 5, barkPrice: 11.00, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "content creator", barkCredits: 4, barkPrice: 8.80, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "resume writer", barkCredits: 3.5, barkPrice: 7.70, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "voice actor", barkCredits: 4, barkPrice: 8.80, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "copywriter", barkCredits: 4, barkPrice: 8.80, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "editor", barkCredits: 3.5, barkPrice: 7.70, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "proofreader", barkCredits: 3, barkPrice: 6.60, category: "Creative & Design", valueIndicator: "low-value" },
  { keyword: "tutor", barkCredits: 4, barkPrice: 8.80, category: "Personal Services", valueIndicator: "low-value" },
  
  // ===== HIGH-VALUE PROFESSIONAL SERVICES (Reclassified) =====
  { keyword: "web developer", barkCredits: 10, barkPrice: 22.00, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "software developer", barkCredits: 11, barkPrice: 24.20, category: "IT & Software Development", valueIndicator: "high-value" },
  { keyword: "seo expert", barkCredits: 9, barkPrice: 19.80, category: "Marketing & Advertising", valueIndicator: "high-value" },
  { keyword: "ppc manager", barkCredits: 9, barkPrice: 19.80, category: "Marketing & Advertising", valueIndicator: "high-value" },
  { keyword: "google ads manager", barkCredits: 9, barkPrice: 19.80, category: "Marketing & Advertising", valueIndicator: "high-value" },
  { keyword: "marketing strategist", barkCredits: 10, barkPrice: 22.00, category: "Marketing & Advertising", valueIndicator: "high-value" },
  { keyword: "graphic designer", barkCredits: 8, barkPrice: 17.60, category: "Creative & Design", valueIndicator: "high-value" },
  { keyword: "video editor", barkCredits: 8, barkPrice: 17.60, category: "Creative & Design", valueIndicator: "high-value" },
  { keyword: "animator", barkCredits: 7, barkPrice: 15.40, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "ux designer", barkCredits: 8, barkPrice: 17.60, category: "Creative & Design", valueIndicator: "mid-value" },
  { keyword: "ui designer", barkCredits: 8, barkPrice: 17.60, category: "Creative & Design", valueIndicator: "mid-value" },

  // ===== EVENTS & ENTERTAINMENT (30 keywords) =====
  { keyword: "wedding planner", barkCredits: 12, barkPrice: 26.40, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "wedding coordinator", barkCredits: 11, barkPrice: 24.20, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "wedding dj", barkCredits: 10, barkPrice: 22.00, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "wedding photographer", barkCredits: 11, barkPrice: 24.20, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "wedding videographer", barkCredits: 10, barkPrice: 22.00, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "wedding caterer", barkCredits: 9, barkPrice: 19.80, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "wedding venue", barkCredits: 12, barkPrice: 26.40, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "event dj", barkCredits: 7, barkPrice: 15.40, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "live band", barkCredits: 8, barkPrice: 17.60, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "musician for hire", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "event mc", barkCredits: 7, barkPrice: 15.40, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "party entertainer", barkCredits: 5, barkPrice: 11.00, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "magician", barkCredits: 5, barkPrice: 11.00, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "face painter", barkCredits: 3.5, barkPrice: 7.70, category: "Events & Entertainment", valueIndicator: "low-value" },
  { keyword: "balloon artist", barkCredits: 3, barkPrice: 6.60, category: "Events & Entertainment", valueIndicator: "low-value" },
  { keyword: "event photographer", barkCredits: 8, barkPrice: 17.60, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "corporate event planner", barkCredits: 10, barkPrice: 22.00, category: "Events & Entertainment", valueIndicator: "high-value" },
  { keyword: "party planner", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "birthday party planner", barkCredits: 5, barkPrice: 11.00, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "bar service", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "bartender for hire", barkCredits: 4.5, barkPrice: 9.90, category: "Events & Entertainment", valueIndicator: "low-value" },
  { keyword: "photo booth rental", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "event decorator", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "florist", barkCredits: 6, barkPrice: 13.20, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "wedding florist", barkCredits: 8, barkPrice: 17.60, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "event lighting", barkCredits: 7, barkPrice: 15.40, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "sound system rental", barkCredits: 5.5, barkPrice: 12.10, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "party rental", barkCredits: 5, barkPrice: 11.00, category: "Events & Entertainment", valueIndicator: "mid-value" },
  { keyword: "event staff", barkCredits: 4, barkPrice: 8.80, category: "Events & Entertainment", valueIndicator: "low-value" },
  { keyword: "wedding cake designer", barkCredits: 7, barkPrice: 15.40, category: "Events & Entertainment", valueIndicator: "mid-value" },

  // ===== CHILDCARE & FAMILY SERVICES (15 keywords) =====
  { keyword: "babysitter", barkCredits: 4, barkPrice: 8.80, category: "Childcare & Family", valueIndicator: "low-value" },
  { keyword: "nanny", barkCredits: 7, barkPrice: 15.40, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "daycare", barkCredits: 8, barkPrice: 17.60, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "after school care", barkCredits: 5, barkPrice: 11.00, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "au pair", barkCredits: 9, barkPrice: 19.80, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "newborn care specialist", barkCredits: 10, barkPrice: 22.00, category: "Childcare & Family", valueIndicator: "high-value" },
  { keyword: "postpartum doula", barkCredits: 9, barkPrice: 19.80, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "birth doula", barkCredits: 8, barkPrice: 17.60, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "sleep consultant", barkCredits: 8, barkPrice: 17.60, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "lactation consultant", barkCredits: 8, barkPrice: 17.60, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "parenting coach", barkCredits: 7, barkPrice: 15.40, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "special needs caregiver", barkCredits: 9, barkPrice: 19.80, category: "Childcare & Family", valueIndicator: "mid-value" },
  { keyword: "child psychologist", barkCredits: 11, barkPrice: 24.20, category: "Childcare & Family", valueIndicator: "high-value" },
  { keyword: "family therapist", barkCredits: 10, barkPrice: 22.00, category: "Childcare & Family", valueIndicator: "high-value" },
  { keyword: "child tutor", barkCredits: 5, barkPrice: 11.00, category: "Childcare & Family", valueIndicator: "mid-value" },

  // ===== SENIOR & HOME CARE (12 keywords) =====
  { keyword: "home care aide", barkCredits: 8, barkPrice: 17.60, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "senior care", barkCredits: 9, barkPrice: 19.80, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "elder care", barkCredits: 9, barkPrice: 19.80, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "companion care", barkCredits: 7, barkPrice: 15.40, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "live-in caregiver", barkCredits: 10, barkPrice: 22.00, category: "Senior & Home Care", valueIndicator: "high-value" },
  { keyword: "dementia care", barkCredits: 11, barkPrice: 24.20, category: "Senior & Home Care", valueIndicator: "high-value" },
  { keyword: "alzheimers care", barkCredits: 11, barkPrice: 24.20, category: "Senior & Home Care", valueIndicator: "high-value" },
  { keyword: "hospice care", barkCredits: 10, barkPrice: 22.00, category: "Senior & Home Care", valueIndicator: "high-value" },
  { keyword: "respite care", barkCredits: 8, barkPrice: 17.60, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "home health aide", barkCredits: 9, barkPrice: 19.80, category: "Senior & Home Care", valueIndicator: "mid-value" },
  { keyword: "nursing care", barkCredits: 11, barkPrice: 24.20, category: "Senior & Home Care", valueIndicator: "high-value" },
  { keyword: "assisted living", barkCredits: 10, barkPrice: 22.00, category: "Senior & Home Care", valueIndicator: "high-value" },

  // ===== AUTOMOTIVE SERVICES (20 keywords) =====
  { keyword: "auto mechanic", barkCredits: 7, barkPrice: 15.40, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "car repair", barkCredits: 7, barkPrice: 15.40, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "mobile mechanic", barkCredits: 8, barkPrice: 17.60, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "brake repair", barkCredits: 6.5, barkPrice: 14.30, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "transmission repair", barkCredits: 8, barkPrice: 17.60, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "oil change", barkCredits: 4, barkPrice: 8.80, category: "Automotive Services", valueIndicator: "low-value" },
  { keyword: "tire repair", barkCredits: 5, barkPrice: 11.00, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "tire replacement", barkCredits: 6, barkPrice: 13.20, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "auto detailing", barkCredits: 5, barkPrice: 11.00, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "car detailing", barkCredits: 5, barkPrice: 11.00, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "auto body shop", barkCredits: 7.5, barkPrice: 16.50, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "collision repair", barkCredits: 8, barkPrice: 17.60, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "paint and body", barkCredits: 7, barkPrice: 15.40, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "engine repair", barkCredits: 8, barkPrice: 17.60, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "radiator repair", barkCredits: 6, barkPrice: 13.20, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "muffler repair", barkCredits: 5.5, barkPrice: 12.10, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "auto glass repair", barkCredits: 6, barkPrice: 13.20, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "windshield replacement", barkCredits: 6.5, barkPrice: 14.30, category: "Automotive Services", valueIndicator: "mid-value" },
  { keyword: "car wash", barkCredits: 3, barkPrice: 6.60, category: "Automotive Services", valueIndicator: "low-value" },
  { keyword: "towing service", barkCredits: 6, barkPrice: 13.20, category: "Automotive Services", valueIndicator: "mid-value" },

  // ===== MUSIC & PERFORMANCE LESSONS (25 keywords) =====
  { keyword: "piano lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "guitar lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "violin lessons", barkCredits: 6, barkPrice: 13.20, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "drum lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "vocal lessons", barkCredits: 5.5, barkPrice: 12.10, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "singing lessons", barkCredits: 5.5, barkPrice: 12.10, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "bass lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "saxophone lessons", barkCredits: 5.5, barkPrice: 12.10, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "flute lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "trumpet lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "clarinet lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "cello lessons", barkCredits: 6, barkPrice: 13.20, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "ukulele lessons", barkCredits: 4.5, barkPrice: 9.90, category: "Music & Performance", valueIndicator: "low-value" },
  { keyword: "music production", barkCredits: 7, barkPrice: 15.40, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "dj lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "dance lessons", barkCredits: 4.5, barkPrice: 9.90, category: "Music & Performance", valueIndicator: "low-value" },
  { keyword: "ballet lessons", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "hip hop dance", barkCredits: 4.5, barkPrice: 9.90, category: "Music & Performance", valueIndicator: "low-value" },
  { keyword: "salsa lessons", barkCredits: 4.5, barkPrice: 9.90, category: "Music & Performance", valueIndicator: "low-value" },
  { keyword: "ballroom dance", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "acting lessons", barkCredits: 5.5, barkPrice: 12.10, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "voice acting coach", barkCredits: 6, barkPrice: 13.20, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "theater classes", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "music theory tutor", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },
  { keyword: "music teacher", barkCredits: 5, barkPrice: 11.00, category: "Music & Performance", valueIndicator: "mid-value" },

  // ===== MENTAL HEALTH & WELLNESS (20 keywords) =====
  { keyword: "therapist", barkCredits: 11, barkPrice: 24.20, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "counselor", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "psychologist", barkCredits: 12, barkPrice: 26.40, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "psychiatrist", barkCredits: 13, barkPrice: 28.60, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "marriage counselor", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "couples therapist", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "relationship counselor", barkCredits: 9, barkPrice: 19.80, category: "Mental Health & Wellness", valueIndicator: "mid-value" },
  { keyword: "life coach", barkCredits: 8, barkPrice: 17.60, category: "Mental Health & Wellness", valueIndicator: "mid-value" },
  { keyword: "career coach", barkCredits: 8, barkPrice: 17.60, category: "Mental Health & Wellness", valueIndicator: "mid-value" },
  { keyword: "executive coach", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "addiction counselor", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "substance abuse counselor", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "grief counselor", barkCredits: 9, barkPrice: 19.80, category: "Mental Health & Wellness", valueIndicator: "mid-value" },
  { keyword: "trauma therapist", barkCredits: 11, barkPrice: 24.20, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "anxiety therapist", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "depression therapist", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "eating disorder therapist", barkCredits: 11, barkPrice: 24.20, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "behavioral therapist", barkCredits: 10, barkPrice: 22.00, category: "Mental Health & Wellness", valueIndicator: "high-value" },
  { keyword: "clinical social worker", barkCredits: 9, barkPrice: 19.80, category: "Mental Health & Wellness", valueIndicator: "mid-value" },
  { keyword: "wellness coach", barkCredits: 7, barkPrice: 15.40, category: "Mental Health & Wellness", valueIndicator: "mid-value" },

  // ===== LANGUAGE SERVICES (15 keywords) =====
  { keyword: "translator", barkCredits: 7, barkPrice: 15.40, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "interpreter", barkCredits: 8, barkPrice: 17.60, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "spanish translator", barkCredits: 7, barkPrice: 15.40, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "spanish tutor", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "french tutor", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "mandarin tutor", barkCredits: 6, barkPrice: 13.20, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "english tutor", barkCredits: 4.5, barkPrice: 9.90, category: "Language Services", valueIndicator: "low-value" },
  { keyword: "esl teacher", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "language teacher", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "german tutor", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "italian tutor", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "japanese tutor", barkCredits: 6, barkPrice: 13.20, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "portuguese tutor", barkCredits: 5, barkPrice: 11.00, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "arabic tutor", barkCredits: 6, barkPrice: 13.20, category: "Language Services", valueIndicator: "mid-value" },
  { keyword: "sign language interpreter", barkCredits: 8, barkPrice: 17.60, category: "Language Services", valueIndicator: "mid-value" },

  // ===== REPAIR & TECHNICAL SUPPORT (25 keywords) =====
  { keyword: "locksmith", barkCredits: 7, barkPrice: 15.40, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "appliance repair", barkCredits: 7, barkPrice: 15.40, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "refrigerator repair", barkCredits: 7, barkPrice: 15.40, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "washer repair", barkCredits: 6.5, barkPrice: 14.30, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "dryer repair", barkCredits: 6.5, barkPrice: 14.30, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "dishwasher repair", barkCredits: 6.5, barkPrice: 14.30, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "oven repair", barkCredits: 7, barkPrice: 15.40, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "computer repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "laptop repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "phone repair", barkCredits: 5, barkPrice: 11.00, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "iphone repair", barkCredits: 5.5, barkPrice: 12.10, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "tablet repair", barkCredits: 5, barkPrice: 11.00, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "tv repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "security system installation", barkCredits: 8, barkPrice: 17.60, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "home security", barkCredits: 8, barkPrice: 17.60, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "garage door repair", barkCredits: 7.5, barkPrice: 16.50, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "garage door installation", barkCredits: 8, barkPrice: 17.60, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "door repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "window repair", barkCredits: 6.5, barkPrice: 14.30, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "small engine repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "power tool repair", barkCredits: 5.5, barkPrice: 12.10, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "watch repair", barkCredits: 5, barkPrice: 11.00, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "jewelry repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "furniture repair", barkCredits: 6, barkPrice: 13.20, category: "Repair & Technical", valueIndicator: "mid-value" },
  { keyword: "upholstery repair", barkCredits: 6.5, barkPrice: 14.30, category: "Repair & Technical", valueIndicator: "mid-value" },

  // ===== FITNESS & WELLNESS (20 keywords) =====
  { keyword: "yoga instructor", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "yoga classes", barkCredits: 4.5, barkPrice: 9.90, category: "Fitness & Wellness", valueIndicator: "low-value" },
  { keyword: "pilates instructor", barkCredits: 5.5, barkPrice: 12.10, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "personal trainer", barkCredits: 5.5, barkPrice: 12.10, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "fitness trainer", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "nutritionist", barkCredits: 7, barkPrice: 15.40, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "dietitian", barkCredits: 7, barkPrice: 15.40, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "meal prep", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "health coach", barkCredits: 6.5, barkPrice: 14.30, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "meditation instructor", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "mindfulness coach", barkCredits: 6, barkPrice: 13.20, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "strength training", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "crossfit trainer", barkCredits: 5.5, barkPrice: 12.10, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "boxing trainer", barkCredits: 5.5, barkPrice: 12.10, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "martial arts instructor", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "zumba instructor", barkCredits: 4.5, barkPrice: 9.90, category: "Fitness & Wellness", valueIndicator: "low-value" },
  { keyword: "spin instructor", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "boot camp", barkCredits: 5, barkPrice: 11.00, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "sports coach", barkCredits: 5.5, barkPrice: 12.10, category: "Fitness & Wellness", valueIndicator: "mid-value" },
  { keyword: "physical therapy", barkCredits: 9, barkPrice: 19.80, category: "Fitness & Wellness", valueIndicator: "mid-value" },

  // ===== ACADEMIC TUTORING (20 keywords) =====
  { keyword: "math tutor", barkCredits: 5, barkPrice: 11.00, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "algebra tutor", barkCredits: 5, barkPrice: 11.00, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "calculus tutor", barkCredits: 6, barkPrice: 13.20, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "geometry tutor", barkCredits: 5, barkPrice: 11.00, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "science tutor", barkCredits: 5, barkPrice: 11.00, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "chemistry tutor", barkCredits: 6, barkPrice: 13.20, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "physics tutor", barkCredits: 6, barkPrice: 13.20, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "biology tutor", barkCredits: 5.5, barkPrice: 12.10, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "reading tutor", barkCredits: 4.5, barkPrice: 9.90, category: "Academic Tutoring", valueIndicator: "low-value" },
  { keyword: "writing tutor", barkCredits: 5, barkPrice: 11.00, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "english tutor", barkCredits: 4.5, barkPrice: 9.90, category: "Academic Tutoring", valueIndicator: "low-value" },
  { keyword: "history tutor", barkCredits: 4.5, barkPrice: 9.90, category: "Academic Tutoring", valueIndicator: "low-value" },
  { keyword: "sat tutor", barkCredits: 7, barkPrice: 15.40, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "act tutor", barkCredits: 7, barkPrice: 15.40, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "gre tutor", barkCredits: 8, barkPrice: 17.60, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "gmat tutor", barkCredits: 8, barkPrice: 17.60, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "test prep tutor", barkCredits: 6.5, barkPrice: 14.30, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "college admissions consultant", barkCredits: 9, barkPrice: 19.80, category: "Academic Tutoring", valueIndicator: "mid-value" },
  { keyword: "homework help", barkCredits: 4, barkPrice: 8.80, category: "Academic Tutoring", valueIndicator: "low-value" },
  { keyword: "special education tutor", barkCredits: 7, barkPrice: 15.40, category: "Academic Tutoring", valueIndicator: "mid-value" },

  // ===== ADDITIONAL CONSTRUCTION & TRADES (15 keywords) =====
  { keyword: "drywall installer", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "drywall repair", barkCredits: 6, barkPrice: 13.20, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "insulation contractor", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "window installation", barkCredits: 7.5, barkPrice: 16.50, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "door installation", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "deck builder", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "deck repair", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "fence installation", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "fence repair", barkCredits: 6, barkPrice: 13.20, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "masonry", barkCredits: 7.5, barkPrice: 16.50, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "brick mason", barkCredits: 7.5, barkPrice: 16.50, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "concrete contractor", barkCredits: 8, barkPrice: 17.60, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "concrete repair", barkCredits: 6.5, barkPrice: 14.30, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "welding", barkCredits: 7, barkPrice: 15.40, category: "Construction & Home Services", valueIndicator: "mid-value" },
  { keyword: "gutter installation", barkCredits: 6.5, barkPrice: 14.30, category: "Construction & Home Services", valueIndicator: "mid-value" },

  // ===== PET SERVICES EXPANSION (10 keywords) =====
  { keyword: "dog training", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "puppy training", barkCredits: 5.5, barkPrice: 12.10, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "obedience training", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "veterinarian", barkCredits: 8, barkPrice: 17.60, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "mobile vet", barkCredits: 9, barkPrice: 19.80, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "pet photography", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "pet boarding", barkCredits: 4, barkPrice: 8.80, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "dog daycare", barkCredits: 4, barkPrice: 8.80, category: "Personal Services", valueIndicator: "low-value" },
  { keyword: "aquarium maintenance", barkCredits: 5, barkPrice: 11.00, category: "Personal Services", valueIndicator: "mid-value" },
  { keyword: "exotic pet care", barkCredits: 6, barkPrice: 13.20, category: "Personal Services", valueIndicator: "mid-value" },
];

/**
 * Round up to nearest $0.50 or whole number
 */
const roundUpToHalf = (value: number): number => {
  return Math.ceil(value * 2) / 2;
};

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
 * Calculate DigsandGigs lead cost from Bark pricing
 * Formula (all rounded up to nearest $0.50):
 * - Non-Exclusive Unconfirmed: Bark × 0.90
 * - Non-Exclusive Confirmed: Bark × 1.25
 * - Semi-Exclusive: Bark × 2.00
 * - 24-Hour Exclusive: Bark × 4.00
 */
export function calculateLeadCostFromBark(
  barkPrice: number, 
  exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h',
  isConfirmed: boolean = false
): number {
  let price: number;
  
  if (exclusivityType === 'exclusive-24h') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.exclusive24h;
  } else if (exclusivityType === 'semi-exclusive') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.semiExclusive;
  } else if (isConfirmed) {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveConfirmed;
  } else {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed;
  }
  
  return roundUpToHalf(price);
}

/**
 * Get all lead costs for a keyword from Bark database
 * Returns null if keyword not found
 */
export function getBarkLeadCosts(keyword: string): {
  barkPrice: number;
  nonExclusiveUnconfirmed: number;
  nonExclusiveConfirmed: number;
  semiExclusive: number;
  exclusive24h: number;
  valueIndicator: 'low-value' | 'mid-value' | 'high-value';
} | null {
  const barkData = lookupBarkPrice(keyword);
  if (!barkData) return null;
  
  return {
    barkPrice: barkData.barkPrice,
    nonExclusiveUnconfirmed: calculateLeadCostFromBark(barkData.barkPrice, 'non-exclusive', false),
    nonExclusiveConfirmed: calculateLeadCostFromBark(barkData.barkPrice, 'non-exclusive', true),
    semiExclusive: calculateLeadCostFromBark(barkData.barkPrice, 'semi-exclusive', false),
    exclusive24h: calculateLeadCostFromBark(barkData.barkPrice, 'exclusive-24h', false),
    valueIndicator: barkData.valueIndicator,
  };
}

/**
 * Get category average Bark price and calculate lead costs
 * Used when specific keyword not found
 */
export function getCategoryBarkLeadCosts(category: string): {
  avgBarkPrice: number;
  nonExclusiveUnconfirmed: number;
  nonExclusiveConfirmed: number;
  semiExclusive: number;
  exclusive24h: number;
} {
  const avgBarkPrice = getAverageBarkPriceForCategory(category);
  const effectivePrice = avgBarkPrice > 0 ? avgBarkPrice : 15; // Default to $15 if no data
  
  return {
    avgBarkPrice: effectivePrice,
    nonExclusiveUnconfirmed: calculateLeadCostFromBark(effectivePrice, 'non-exclusive', false),
    nonExclusiveConfirmed: calculateLeadCostFromBark(effectivePrice, 'non-exclusive', true),
    semiExclusive: calculateLeadCostFromBark(effectivePrice, 'semi-exclusive', false),
    exclusive24h: calculateLeadCostFromBark(effectivePrice, 'exclusive-24h', false),
  };
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

// Legacy function for backward compatibility
export function calculateCPLFromBark(barkPrice: number, tier: 'free' | 'pro' | 'premium'): number {
  // Map old tier system to new exclusivity-based pricing
  // free = non-exclusive unconfirmed
  // pro = semi-exclusive
  // premium = exclusive-24h
  switch (tier) {
    case 'premium':
      return calculateLeadCostFromBark(barkPrice, 'exclusive-24h', false);
    case 'pro':
      return calculateLeadCostFromBark(barkPrice, 'semi-exclusive', false);
    case 'free':
    default:
      return calculateLeadCostFromBark(barkPrice, 'non-exclusive', false);
  }
}
