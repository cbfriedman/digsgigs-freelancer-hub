/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 * 
 * SIMPLIFIED PRICING MODEL
 * All lead pricing is based on industry categories with transparent pricing.
 * 
 * - Unconfirmed leads: Base industry price
 * - Confirmed leads: Base price + 20% premium (phone-verified)
 * 
 * All prices rounded up to nearest $0.50 or whole number.
 * 
 * NOTE: Exclusivity tiers have been removed. All leads are now non-exclusive.
 */

import { getKeywordCPC } from '@/config/googleCpcKeywords';
import { 
  lookupBarkPrice, 
  calculateLeadCostFromBark, 
  getAverageBarkPriceForCategory,
  BARK_PRICING_MULTIPLIERS,
  LEAD_CONVERSION_RATES 
} from '@/utils/barkPricingLookup';

export type IndustryCategory = 'low-value' | 'mid-value' | 'high-value';
export type ValueIndicator = 'LV' | 'MV' | 'HV';

export interface IndustryItem {
  name: string;
  value: IndustryCategory;
  indicator: ValueIndicator;
}

export interface IndustryGroup {
  categoryName: string;
  industries: IndustryItem[];
}

export interface IndustryPricing {
  category: IndustryCategory;
  industries: string[];
  nonExclusive: number;  // Standard lead price
  /** @deprecated - exclusivity removed, all leads are non-exclusive */
  semiExclusive: number;
  /** @deprecated - exclusivity removed, all leads are non-exclusive */
  exclusive24h: number;
}

/**
 * @deprecated - Exclusivity tiers removed. All leads are now non-exclusive.
 * Kept for backward compatibility with existing code.
 */
export interface PricingTier {
  id: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  name: string;
  exclusivityPeriod: string;
  description: string;
  /** @deprecated - Escrow feature removed */
  escrowFee: string;
  /** @deprecated - Escrow feature removed */
  escrowFeeValue: number;
  /** @deprecated - Escrow feature removed */
  escrowProcessingFee: string;
  /** @deprecated - Escrow feature removed */
  escrowProcessingFeeValue: number;
  /** @deprecated - Escrow feature removed */
  escrowProcessingMinimum: number;
  priceId: string | null;
  productId: string | null;
  popular: boolean;
}

// Exclusivity-based lead pricing by industry category
// Non-exclusive Unconfirmed: 25% of Google CPC
// Non-exclusive Confirmed: 30% of Google CPC
// Semi-exclusive: 50% of Google CPC
// Exclusive-24h: 90% of Google CPC
export const INDUSTRY_PRICING: IndustryPricing[] = [
  {
    category: 'low-value',
    industries: [
      // Home & Local Services
      'Cleaning & Janitorial',
      'Handyman',
      'Handyman Services',
      'Pet Care & Grooming',
      'Pet Grooming',
      'Pet Sitting',
      'Dog Walking',
      'Tutoring',
      'Tutoring & Education',
      'Moving & Delivery',
      'Moving Services',
      'Delivery Services',
      'Courier Services',
      'Packing Services',
      'Event Planning',
      'Catering',
      'Beauty & Wellness',
      'House Cleaning',
      'Carpet Cleaning',
      'Pressure Washing',
      'Snow Removal',
      'Snow Plowing',
      'Pool Maintenance',
      'Lawn Care',
      'Lawn Mowing',
      'Tree Trimming',
      'Deck Cleaning',
      
      // Personal Services
      'Bartending',
      'DJ Services',
      'Hair Styling',
      'House Sitting',
      'Makeup Artist',
      'Personal Shopping',
      'Photography (Portrait)',
      'Fitness Training',
      'Personal Training',
      'Life Coaching',
      'Life Coach',
      'Fitness Coaching',
      'Fitness Coach',
      'Business Coaching',
      'Business Coach',
      'Massage Therapy',
      'Nutrition Consulting',
      'Yoga Instruction',
      
      // Digital & Creative - Entry Level
      'Data Entry',
      'Virtual Assistant',
      'Customer Support',
      'Customer Service',
      'Transcription',
      'Basic Graphic Design',
      'Photo Editing',
      'Photo Retouching',
      'Simple Logo Design',
      'Logo Design',
      'Icon Design',
      'Social Media Management',
      'Social Media Manager',
      'Content Writing',
      'Article Writing',
      'Blog Writing',
      'Copywriting',
      'Copywriter',
      'Creative Writing',
      'Editing',
      'Editor',
      'Proofreader',
      'eBook Writing',
      'Press Release Writing',
      'Product Descriptions',
      'Resume Writing',
      'Resume Writer',
      'Proofreading',
      'Basic Video Editing',
      'Voice Over',
      'Voice Actor',
      'Audio Editing',
      'Product Photography',
      'Real Estate Photography',
      'Translation',
      'Translator',
      'Language Tutoring',
      'Book Cover Design',
      'Calligraphy',
      'Infographic Design',
      'Presentation Design',
      'Print Design',
      'T-Shirt Design',
      'Tattoo Design',
      'Vector Tracing',
      'Content Creator',
      'AI Trainer',
      'Prompt Writer',
      'Prompt Engineer',
      'Podcast Producer',
      'Podcast Production',
      
      // IT & Software - Entry Level
      'IT Support',
      'WordPress Development',
      'Website Maintenance',
      
      // Marketing - Entry Level
      'Email Marketing',
      'Email Marketer',
    ],
    nonExclusive: 7.50,     // 20% of Google CPC (~$37.50)
    semiExclusive: 37.50,   // = Google CPC (non-exclusive / 0.20)
    exclusive24h: 75.00     // = 2x Google CPC (2x semi-exclusive)
  },
  {
    category: 'mid-value',
    industries: [
      // Home & Construction Services
      'HVAC',
      'Plumbing',
      'Electrical',
      'Landscaping',
      'Landscape Design',
      'Roofing',
      'Roof Repair',
      'Carpentry',
      'Painting',
      'Flooring',
      'General Contracting',
      'Auto Repair',
      'Appliance Repair',
      'Appliance Installation',
      'Pest Control',
      'Tree Service',
      'Tree Removal',
      'Arborist',
      'Masonry',
      'Windows & Doors',
      'Concrete Work',
      'Fencing',
      'Fence Repair',
      'Pool Service',
      'Pool Installation',
      'Asbestos Removal',
      'Basement Finishing',
      'Bathroom Remodeling',
      'Cabinetry',
      'Carpet Installation',
      'Deck Building',
      'Deck Staining',
      'Demolition',
      'Drywall',
      'Foundation Repair',
      'Garage Door Repair',
      'Gutter Installation',
      'Home Addition',
      'Home Inspection',
      'Insulation',
      'Kitchen Remodeling',
      'Locksmith',
      'Mold Remediation',
      'Plastering',
      'Remodeling',
      'Septic System',
      'Siding',
      'Tile Installation',
      'Waterproofing',
      'Well Drilling',
      
      // Landscaping & Outdoor
      'Garden Design',
      'Hardscaping',
      'Irrigation Installation',
      'Outdoor Lighting',
      'Patio Installation',
      'Sod Installation',
      
      // Digital & Creative - Professional Level (not HV)
      'Web Design',
      'E-commerce Development',
      'UI/UX Design',
      'UX Designer',
      'UI Designer',
      'Illustration',
      'Animation',
      'Animator',
      '2D Animation',
      '3D Modeling',
      'CAD Design',
      'Character Design',
      'Fashion Design',
      'Game Art',
      'Interior Design',
      'Jewelry Design',
      'Motion Graphics',
      'Packaging Design',
      'Product Design',
      'Storyboarding',
      'Technical Illustration',
      'Photography',
      'Photography (Wedding)',
      'Architectural Rendering',
      'Art Direction',
      
      // Data & Analytics - Mid Level
      'Business Intelligence',
      'Data Analysis',
      'Data Mining',
      'Data Visualization',
      'Database Administration',
      'Database Design',
      'Database Development',
      'Statistical Analysis',
      
      // Financial Services - Mid Level
      'Debt Consolidation',
      'Payroll Services',
      
      // Health & Wellness - Mid Level
      'Acupuncture',
      'Chiropractic',
      'Dietitian',
      'Mental Health Counseling',
      'Occupational Therapy',
      'Physical Therapy',
      'Speech Therapy',
      'Veterinary Services',
      
      // IT & Software - Mid Level
      'Database Development',
      'DevOps',
      'E-commerce Development',
      'Frontend Development',
      'Network Administration',
      'Quality Assurance',
      'System Administration',
      
      // Legal Services - Mid Level
      'Paralegal Services',
      'Legal Research',
      
      // Marketing & Advertising - Mid Level
      'Affiliate Marketing',
      'Content Marketing',
      'Event Marketing',
      'Growth Hacking',
      'Influencer Marketing',
      'Market Research',
      'Marketing Analytics',
      'Marketing Automation',
      'PR & Communications',
      'Social Media Marketing',
      'Video Marketing',
      
      // Personal Services - Mid Level
      'Catering',
      'Event Planning',
      'Personal Chef',
      'Wedding Planning',
      
      // Real Estate - Mid Level
      'Home Staging',
      'Property Management',
      'Real Estate Appraisal',
      
      // Translation - Mid Level
      'Document Translation',
      'Interpretation',
      'Localization',
      'Technical Translation',
      
      // Transportation - Mid Level
      'Freight Brokerage',
      'Logistics Consulting',
      'Moving & Storage',
      'Transportation Planning',
      'Trucking',
      'Warehouse Management',
      
      // Writing & Content - Mid Level
      'Business Writing',
      'Content Strategy',
      'Ghost Writing',
      'Grant Writing',
      'Screenplay Writing',
      'Speech Writing',
      'Technical Writing',
      'White Paper Writing',
      
      // Business & Consulting - Mid Level
      'HR Consulting',
      'Sales Consulting',
      'Supply Chain Consulting',
      
      // Architecture & Engineering - Mid Level
      'Interior Architecture',
      'Landscape Architecture',
      'Urban Planning',
      
      // Consulting - General
      'Consultant',
    ],
    nonExclusive: 14.50,    // 20% of Google CPC (~$72.50)
    semiExclusive: 72.50,   // = Google CPC (non-exclusive / 0.20)
    exclusive24h: 145.00    // = 2x Google CPC (2x semi-exclusive)
  },
  {
    category: 'high-value',
    industries: [
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
      'Legal Consulting',
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
      'Estate Planning Lawyer',
      'estate planning lawyer',
      'Accounting',
      'Bookkeeping',
      'Tax Preparation',
      'CPA Services',
      'Tax Services',
      'tax services',
      'Small Business Tax Services',
      'small business tax services',
      'Tax Accountant',
      'tax accountant',
      'Business Lawyer',
      'business lawyer',
      'Real Estate Attorney',
      'real estate attorney',
      'Tax Law Attorney',
      'tax law attorney',
      
      // Tax Relief Services
      'Tax Relief',
      'Tax Relief Services',
      'IRS Tax Relief',
      'Tax Debt Relief',
      'Back Taxes Help',
      'Offer in Compromise',
      'Tax Lien Removal',
      'Tax Levy Release',
      'IRS Debt Settlement',
      'Tax Penalty Abatement',
      
      // Real Estate
      'Real Estate',
      'Real Estate Agent',
      'Commercial Real Estate',
      'Real Estate Development',
      'Real Estate Investment',
      'Residential Real Estate',
      
      // Medical & Dental
      'Medical & Dental',
      'Healthcare Consulting',
      'Dental Services',
      'Nursing Services',
      'Telemedicine',
      
      // Business Consulting
      'Business Consulting',
      'Business Consultant',
      'Brand Consulting',
      'Change Management',
      'Executive Coaching',
      'Financial Consulting',
      'IT Consulting',
      'Management Consulting',
      'Marketing Consulting',
      'Marketing Strategist',
      'Marketing Strategy',
      'Operations Consulting',
      'Risk Management',
      'Strategy Consulting',
      
      // High-Value Tech & Engineering
      'Web Development',
      'Web Developer',
      'Software Development',
      'Software Developer',
      'Enterprise Software Development',
      'Cloud Architecture',
      'Cloud Computing',
      'DevOps Consulting',
      'Cybersecurity',
      'Cybersecurity Consulting',
      'Blockchain Development',
      'AI & Machine Learning',
      'Machine Learning',
      'Data Science',
      'Data Engineering',
      'Big Data Engineering',
      'Predictive Analytics',
      'IT Consulting',
      'ERP Implementation',
      'Salesforce Development',
      'SAP Consulting',
      'API Development',
      'App Development',
      'Custom Software Development',
      'Full Stack Development',
      'Game Development',
      'Mobile App Development',
      'Software Architecture',
      
      // High-Value Marketing
      'SEO',
      'SEO Services',
      'SEO Expert',
      'PPC Management',
      'PPC Manager',
      'Google Ads Management',
      'Google Ads Manager',
      'Digital Marketing',
      'Brand Strategy',
      'Full-Service Marketing',
      'Media Buying',
      'Creative Direction',
      'Public Relations',
      'Marketing & Advertising',
      
      // High-Value Creative
      'Professional Graphic Design',
      'Graphic Designer',
      'Brand Identity Design',
      'Professional Video Editing',
      'Video Editor',
      'Video Production',
      
      // Architecture & Engineering
      'Architecture',
      'Aerospace Engineering',
      'Automotive Engineering',
      'Chemical Engineering',
      'Civil Engineering',
      'Electrical Engineering',
      'Environmental Engineering',
      'Industrial Design',
      'Marine Engineering',
      'Mechanical Engineering',
      'Petroleum Engineering',
      'Structural Engineering',
      'Patent Illustration',
      'Visual Effects (VFX)',
      
      // Writing - High Value
      'Legal Writing',
      'Medical Writing',
      'Patent Writing',
      
      // Translation - High Value
      'Legal Translation',
      'Medical Translation',
      
      // Transportation - High Value
      'Supply Chain Management',
      
      // Solar & Specialized
      'Solar Panel Installation',
      
      // Lowercase variants for UI matching (INDUSTRY_GROUPS uses these)
      'architect',
      'structural engineer',
      'civil engineer',
      'electrical engineer',
      'mechanical engineer',
      'industrial design',
      'management consultant',
      'strategy consultant',
      'business consultant',
      'therapist',
      'counselor',
      'psychologist',
      'psychiatrist',
      'relationship counselor',
      'addiction counselor',
      'college admissions counseling',
      'personal injury lawyer',
      'auto insurance',
      'home insurance',
      'financial advisor',
      'cpa',
      'tax attorney',
      'blockchain developer',
      'cybersecurity consultant',
      'criminal defense attorney',
      'dui attorney',
      'bankruptcy lawyer',
      'divorce lawyer',
      'real estate lawyer',
      'patent attorney',
      'immigration lawyer',
      'web developer',
      'software developer',
      'seo expert',
      'seo',
      'ppc manager',
      'google ads manager',
      'marketing strategist',
      'graphic designer',
      'video editor',
    ],
    nonExclusive: 24.50,   // 20% of Google CPC (~$122.50)
    semiExclusive: 61.25,  // = 50% of Google CPC
    exclusive24h: 111.00   // = CPC × 0.9, rounded up to whole number
  }
];

/**
 * SIMPLIFIED PRICING MODEL - All leads are non-exclusive
 * Exclusivity and escrow features have been removed for simplicity.
 * 
 * Pricing by industry category:
 * - Low-value: $7.50
 * - Mid-value: $14.50  
 * - High-value: $24.50
 * 
 * Confirmed leads add a 20% premium.
 */

/**
 * @deprecated - Exclusivity tiers removed. All leads are now non-exclusive.
 * Kept for backward compatibility with existing code.
 */
export const PRICING_TIERS: Record<'non-exclusive' | 'semi-exclusive' | 'exclusive-24h', PricingTier> = {
  'non-exclusive': {
    id: 'non-exclusive',
    name: 'Standard Lead',
    exclusivityPeriod: 'Shared with matching diggers',
    description: 'Industry-specific pricing - leads shared with all matching diggers in your area',
    escrowFee: 'N/A',
    escrowFeeValue: 0,
    escrowProcessingFee: 'N/A',
    escrowProcessingFeeValue: 0,
    escrowProcessingMinimum: 0,
    priceId: null,
    productId: null,
    popular: true,
  },
  // Deprecated tiers - kept for backward compatibility
  'semi-exclusive': {
    id: 'semi-exclusive',
    name: 'Standard Lead',
    exclusivityPeriod: 'Shared with matching diggers',
    description: 'Feature discontinued - redirects to non-exclusive',
    escrowFee: 'N/A',
    escrowFeeValue: 0,
    escrowProcessingFee: 'N/A',
    escrowProcessingFeeValue: 0,
    escrowProcessingMinimum: 0,
    priceId: null,
    productId: null,
    popular: false,
  },
  'exclusive-24h': {
    id: 'exclusive-24h',
    name: 'Standard Lead',
    exclusivityPeriod: 'Shared with matching diggers',
    description: 'Feature discontinued - redirects to non-exclusive',
    escrowFee: 'N/A',
    escrowFeeValue: 0,
    escrowProcessingFee: 'N/A',
    escrowProcessingFeeValue: 0,
    escrowProcessingMinimum: 0,
    priceId: null,
    productId: null,
    popular: false,
  },
};

// Helper function to get the dominant value tier of a category from INDUSTRY_GROUPS
// This is defined early but references INDUSTRY_GROUPS which is defined below
// We use a function that will be called after INDUSTRY_GROUPS is defined
export const getCategoryValueTier = (categoryName: string): IndustryCategory => {
  // INDUSTRY_GROUPS is defined below, but this function is only called at runtime
  const group = (INDUSTRY_GROUPS as IndustryGroup[]).find(g => 
    g.categoryName.toLowerCase() === categoryName.toLowerCase()
  );
  
  if (!group) return 'mid-value';
  
  // Count industries by tier
  const counts: Record<IndustryCategory, number> = { 'low-value': 0, 'mid-value': 0, 'high-value': 0 };
  group.industries.forEach(ind => counts[ind.value]++);
  
  // Return dominant tier (highest count wins, high-value wins ties)
  if (counts['high-value'] >= counts['mid-value'] && counts['high-value'] >= counts['low-value']) {
    return 'high-value';
  }
  if (counts['mid-value'] >= counts['low-value']) {
    return 'mid-value';
  }
  return 'low-value';
};

// Helper function to get pricing data for a category tier
const getPricingForTier = (tier: IndustryCategory): IndustryPricing => {
  return INDUSTRY_PRICING.find(p => p.category === tier) || INDUSTRY_PRICING[1]; // Default to mid-value
};

/**
 * Round up to the nearest $0.50 or whole number
 */
const roundUpToHalf = (value: number): number => {
  return Math.ceil(value * 2) / 2;
};

/**
 * Calculate lead cost from Bark pricing (PRIMARY PRICING METHOD)
 * Pricing formula (all rounded up to nearest $0.50):
 * - Non-Exclusive Unconfirmed: Bark × 0.90 (5% conversion)
 * - Non-Exclusive Confirmed: Bark × 1.25 (10% conversion)
 * - Semi-Exclusive: Bark × 2.00 (20% conversion)
 * - 24-Hour Exclusive: Bark × 4.00 (50% conversion)
 */
export const getLeadCostFromBarkPrice = (
  barkPrice: number,
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive',
  isConfirmed: boolean = false
): number => {
  let price: number;
  
  if (exclusivity === 'exclusive-24h') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.exclusive24h;  // 4.00
  } else if (exclusivity === 'semi-exclusive') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.semiExclusive; // 2.00
  } else if (isConfirmed) {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveConfirmed; // 1.25
  } else {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed; // 0.90
  }
  
  return roundUpToHalf(price);
};

/**
 * LEGACY: Calculate lead cost from CPC (kept for backward compatibility)
 * @deprecated Use getLeadCostFromBarkPrice instead
 */
export const getLeadCostFromCPC = (
  cpc: number,
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive',
  isConfirmed: boolean = false,
  category: IndustryCategory = 'mid-value'
): number => {
  // Convert CPC to estimated Bark price (CPC / 3 is rough estimate)
  const estimatedBarkPrice = cpc / 3;
  return getLeadCostFromBarkPrice(estimatedBarkPrice, exclusivity, isConfirmed);
};

// Helper function to get lead cost for a specific industry and exclusivity type
// Uses Bark-based dynamic pricing: 0.90X / 1.25X / 2.00X / 4.00X
export const getLeadCostForIndustry = (
  industry: string,
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive',
  isConfirmed: boolean = false,
  parentCategory?: string
): number => {
  const normalizedIndustry = industry.toLowerCase().trim();
  
  // First, try to get Bark price from database
  const barkData = lookupBarkPrice(industry);
  
  if (barkData) {
    // Use Bark-based dynamic pricing
    return calculateLeadCostFromBark(barkData.barkPrice, exclusivity, isConfirmed);
  }
  
  // Fallback: try category average Bark price
  if (parentCategory) {
    const avgBarkPrice = getAverageBarkPriceForCategory(parentCategory);
    if (avgBarkPrice > 0) {
      return getLeadCostFromBarkPrice(avgBarkPrice, exclusivity, isConfirmed);
    }
  }
  
  // Final fallback: use static tier pricing
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.some(ind => ind.toLowerCase().trim() === normalizedIndustry)
  );
  
  let pricingData: IndustryPricing;
  
  if (!industryData) {
    if (parentCategory) {
      const categoryTier = getCategoryValueTier(parentCategory);
      pricingData = getPricingForTier(categoryTier);
    } else {
      pricingData = INDUSTRY_PRICING[1]; // Default to mid-value
    }
  } else {
    pricingData = industryData;
  }
  
  const basePrice = exclusivity === 'non-exclusive' 
    ? pricingData.nonExclusive 
    : exclusivity === 'semi-exclusive'
    ? pricingData.semiExclusive
    : pricingData.exclusive24h;
  
  // Add confirmation premium (1.25X / 0.90X = ~1.39 ratio for confirmed vs unconfirmed)
  if (exclusivity === 'non-exclusive' && isConfirmed) {
    return roundUpToHalf(basePrice * (BARK_PRICING_MULTIPLIERS.nonExclusiveConfirmed / BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed));
  }
  
  return basePrice;
};

// Helper function to get industry category
// Now accepts optional parentCategory for category-aware fallback
export const getIndustryCategory = (industry: string, parentCategory?: string): IndustryCategory => {
  const normalizedIndustry = industry.toLowerCase().trim();
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.some(ind => ind.toLowerCase().trim() === normalizedIndustry)
  );
  
  if (industryData) {
    return industryData.category;
  }
  
  // If specialty not found, inherit from parent category
  if (parentCategory) {
    return getCategoryValueTier(parentCategory);
  }
  
  return 'mid-value';
};

export const getPricingTier = (
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive'
): PricingTier => {
  return PRICING_TIERS[exclusivity];
};

/**
 * @deprecated This constant is deprecated. Use the database taxonomy system instead.
 * The new system uses industry_categories and professions tables via useProfessions hook.
 * This legacy list includes licensed professions and should not be used for new features.
 * See: src/hooks/useProfessions.ts and src/components/SafeProfessionSelector.tsx
 */
// Hierarchical industry structure for UI display - expanded to 22 categories with 357+ professions
export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    categoryName: "Architecture & Engineering",
    industries: [
      { name: "architect", value: "high-value", indicator: "HV" },
      { name: "structural engineer", value: "high-value", indicator: "HV" },
      { name: "civil engineer", value: "high-value", indicator: "HV" },
      { name: "electrical engineer", value: "high-value", indicator: "HV" },
      { name: "mechanical engineer", value: "high-value", indicator: "HV" },
      { name: "industrial design", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Business & Consulting",
    industries: [
      { name: "management consultant", value: "high-value", indicator: "HV" },
      { name: "strategy consultant", value: "high-value", indicator: "HV" },
      { name: "business consultant", value: "high-value", indicator: "HV" },
      { name: "hr consultant", value: "mid-value", indicator: "MV" },
      { name: "marketing consultant", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Construction & Home Services",
    industries: [
      { name: "plumber", value: "mid-value", indicator: "MV" },
      { name: "plumbing service", value: "mid-value", indicator: "MV" },
      { name: "emergency plumber", value: "mid-value", indicator: "MV" },
      { name: "hvac", value: "mid-value", indicator: "MV" },
      { name: "hvac repair", value: "mid-value", indicator: "MV" },
      { name: "air conditioning repair", value: "mid-value", indicator: "MV" },
      { name: "electrician", value: "mid-value", indicator: "MV" },
      { name: "electrical contractor", value: "mid-value", indicator: "MV" },
      { name: "roofing contractor", value: "mid-value", indicator: "MV" },
      { name: "roof repair", value: "mid-value", indicator: "MV" },
      { name: "general contractor", value: "mid-value", indicator: "MV" },
      { name: "home remodeling", value: "mid-value", indicator: "MV" },
      { name: "kitchen remodeling", value: "mid-value", indicator: "MV" },
      { name: "bathroom remodeling", value: "mid-value", indicator: "MV" },
      { name: "pest control", value: "mid-value", indicator: "MV" },
      { name: "termite control", value: "mid-value", indicator: "MV" },
      { name: "house cleaning", value: "low-value", indicator: "LV" },
      { name: "maid service", value: "low-value", indicator: "LV" },
      { name: "carpet cleaning", value: "low-value", indicator: "LV" },
      { name: "handyman", value: "low-value", indicator: "LV" },
      { name: "handyman services", value: "low-value", indicator: "LV" },
      { name: "locksmith", value: "mid-value", indicator: "MV" },
      { name: "appliance repair", value: "mid-value", indicator: "MV" },
      { name: "garage door repair", value: "mid-value", indicator: "MV" },
      { name: "window repair", value: "mid-value", indicator: "MV" },
      { name: "door installation", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Creative & Design",
    industries: [
      { name: "graphic designer", value: "mid-value", indicator: "MV" },
      { name: "logo design", value: "low-value", indicator: "LV" },
      { name: "photo editing", value: "low-value", indicator: "LV" },
      { name: "video production", value: "mid-value", indicator: "MV" },
      { name: "video editing", value: "mid-value", indicator: "MV" },
      { name: "animation services", value: "mid-value", indicator: "MV" },
      { name: "3d modeling", value: "mid-value", indicator: "MV" },
      { name: "illustration", value: "mid-value", indicator: "MV" },
      { name: "ui/ux design", value: "mid-value", indicator: "MV" },
      { name: "brand identity design", value: "mid-value", indicator: "MV" },
      { name: "packaging design", value: "mid-value", indicator: "MV" },
      { name: "product design", value: "mid-value", indicator: "MV" },
      { name: "interior design", value: "mid-value", indicator: "MV" },
      { name: "fashion design", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Data & Analytics",
    industries: [
      { name: "data entry", value: "low-value", indicator: "LV" },
      { name: "data analysis", value: "mid-value", indicator: "MV" },
      { name: "data science", value: "high-value", indicator: "HV" },
      { name: "data engineering", value: "high-value", indicator: "HV" },
      { name: "big data engineering", value: "high-value", indicator: "HV" },
      { name: "database design", value: "mid-value", indicator: "MV" },
      { name: "database administration", value: "mid-value", indicator: "MV" },
      { name: "business intelligence", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Events & Entertainment",
    industries: [
      { name: "wedding planner", value: "mid-value", indicator: "MV" },
      { name: "wedding dj", value: "mid-value", indicator: "MV" },
      { name: "wedding photographer", value: "mid-value", indicator: "MV" },
      { name: "wedding videographer", value: "mid-value", indicator: "MV" },
      { name: "wedding caterer", value: "mid-value", indicator: "MV" },
      { name: "event planner", value: "low-value", indicator: "LV" },
      { name: "party planner", value: "low-value", indicator: "LV" },
      { name: "dj services", value: "low-value", indicator: "LV" },
      { name: "live musician", value: "mid-value", indicator: "MV" },
      { name: "band for hire", value: "mid-value", indicator: "MV" },
      { name: "event photographer", value: "mid-value", indicator: "MV" },
      { name: "event videographer", value: "mid-value", indicator: "MV" },
      { name: "mc/emcee", value: "low-value", indicator: "LV" },
      { name: "magician", value: "low-value", indicator: "LV" },
      { name: "face painter", value: "low-value", indicator: "LV" },
      { name: "balloon artist", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Childcare & Family Services",
    industries: [
      { name: "babysitter", value: "low-value", indicator: "LV" },
      { name: "nanny", value: "mid-value", indicator: "MV" },
      { name: "daycare provider", value: "mid-value", indicator: "MV" },
      { name: "au pair", value: "mid-value", indicator: "MV" },
      { name: "newborn care", value: "mid-value", indicator: "MV" },
      { name: "sleep consultant", value: "mid-value", indicator: "MV" },
      { name: "postpartum doula", value: "mid-value", indicator: "MV" },
      { name: "lactation consultant", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Senior & Home Care",
    industries: [
      { name: "home care specialist", value: "mid-value", indicator: "MV" },
      { name: "elder care", value: "mid-value", indicator: "MV" },
      { name: "companion care", value: "mid-value", indicator: "MV" },
      { name: "medical home care", value: "mid-value", indicator: "MV" },
      { name: "hospice care", value: "mid-value", indicator: "MV" },
      { name: "dementia care", value: "mid-value", indicator: "MV" },
      { name: "respite care", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Automotive Services",
    industries: [
      { name: "auto mechanic", value: "mid-value", indicator: "MV" },
      { name: "auto repair", value: "mid-value", indicator: "MV" },
      { name: "car detailing", value: "low-value", indicator: "LV" },
      { name: "mobile mechanic", value: "mid-value", indicator: "MV" },
      { name: "transmission repair", value: "mid-value", indicator: "MV" },
      { name: "brake repair", value: "mid-value", indicator: "MV" },
      { name: "oil change", value: "low-value", indicator: "LV" },
      { name: "tire services", value: "mid-value", indicator: "MV" },
      { name: "car inspection", value: "low-value", indicator: "LV" },
      { name: "engine repair", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Music & Performance Lessons",
    industries: [
      { name: "piano lessons", value: "mid-value", indicator: "MV" },
      { name: "guitar lessons", value: "mid-value", indicator: "MV" },
      { name: "violin lessons", value: "mid-value", indicator: "MV" },
      { name: "drum lessons", value: "mid-value", indicator: "MV" },
      { name: "vocal lessons", value: "mid-value", indicator: "MV" },
      { name: "bass lessons", value: "mid-value", indicator: "MV" },
      { name: "saxophone lessons", value: "mid-value", indicator: "MV" },
      { name: "flute lessons", value: "mid-value", indicator: "MV" },
      { name: "dance lessons - ballet", value: "mid-value", indicator: "MV" },
      { name: "dance lessons - hip hop", value: "mid-value", indicator: "MV" },
      { name: "dance lessons - salsa", value: "mid-value", indicator: "MV" },
      { name: "acting lessons", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Mental Health & Wellness",
    industries: [
      { name: "therapist", value: "high-value", indicator: "HV" },
      { name: "counselor", value: "high-value", indicator: "HV" },
      { name: "psychologist", value: "high-value", indicator: "HV" },
      { name: "psychiatrist", value: "high-value", indicator: "HV" },
      { name: "life coach", value: "mid-value", indicator: "MV" },
      { name: "career coach", value: "mid-value", indicator: "MV" },
      { name: "relationship counselor", value: "high-value", indicator: "HV" },
      { name: "addiction counselor", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Language Services",
    industries: [
      { name: "translator", value: "mid-value", indicator: "MV" },
      { name: "interpreter", value: "mid-value", indicator: "MV" },
      { name: "spanish tutor", value: "low-value", indicator: "LV" },
      { name: "french tutor", value: "low-value", indicator: "LV" },
      { name: "mandarin tutor", value: "low-value", indicator: "LV" },
      { name: "esl teacher", value: "mid-value", indicator: "MV" },
      { name: "german tutor", value: "low-value", indicator: "LV" },
      { name: "italian tutor", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Repair & Technical Support",
    industries: [
      { name: "computer repair", value: "mid-value", indicator: "MV" },
      { name: "phone repair", value: "mid-value", indicator: "MV" },
      { name: "security systems", value: "mid-value", indicator: "MV" },
      { name: "smart home installation", value: "mid-value", indicator: "MV" },
      { name: "tv mounting", value: "low-value", indicator: "LV" },
      { name: "home theater setup", value: "mid-value", indicator: "MV" },
      { name: "network setup", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Fitness & Wellness",
    industries: [
      { name: "yoga instructor", value: "low-value", indicator: "LV" },
      { name: "pilates instructor", value: "low-value", indicator: "LV" },
      { name: "personal trainer", value: "low-value", indicator: "LV" },
      { name: "nutritionist", value: "mid-value", indicator: "MV" },
      { name: "dietitian", value: "mid-value", indicator: "MV" },
      { name: "meditation coach", value: "low-value", indicator: "LV" },
      { name: "wellness coach", value: "mid-value", indicator: "MV" },
      { name: "massage therapist", value: "low-value", indicator: "LV" },
      { name: "sports trainer", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Academic Tutoring",
    industries: [
      { name: "math tutor", value: "mid-value", indicator: "MV" },
      { name: "science tutor", value: "mid-value", indicator: "MV" },
      { name: "reading tutor", value: "low-value", indicator: "LV" },
      { name: "writing tutor", value: "low-value", indicator: "LV" },
      { name: "sat prep", value: "mid-value", indicator: "MV" },
      { name: "act prep", value: "mid-value", indicator: "MV" },
      { name: "college admissions counseling", value: "high-value", indicator: "HV" },
      { name: "homework help", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Insurance",
    industries: [
      { name: "life insurance", value: "high-value", indicator: "HV" },
      { name: "auto insurance", value: "high-value", indicator: "HV" },
      { name: "health insurance", value: "high-value", indicator: "HV" },
      { name: "home insurance", value: "high-value", indicator: "HV" },
      { name: "business insurance", value: "high-value", indicator: "HV" },
      { name: "renters insurance", value: "mid-value", indicator: "MV" },
      { name: "umbrella insurance", value: "high-value", indicator: "HV" },
      { name: "disability insurance", value: "high-value", indicator: "HV" },
      { name: "long-term care insurance", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Mortgage & Financing",
    industries: [
      { name: "mortgage broker", value: "high-value", indicator: "HV" },
      { name: "loan officer", value: "high-value", indicator: "HV" },
      { name: "refinancing specialist", value: "high-value", indicator: "HV" },
      { name: "hard money lender", value: "high-value", indicator: "HV" },
      { name: "business loan broker", value: "high-value", indicator: "HV" },
      { name: "consumer loan broker", value: "high-value", indicator: "HV" },
      { name: "construction loan specialist", value: "high-value", indicator: "HV" },
      { name: "home equity specialist", value: "high-value", indicator: "HV" },
      { name: "commercial lender", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Financial Services & Accounting",
    industries: [
      { name: "financial advisor", value: "high-value", indicator: "HV" },
      { name: "investment advisor", value: "high-value", indicator: "HV" },
      { name: "wealth management", value: "high-value", indicator: "HV" },
      { name: "cpa", value: "high-value", indicator: "HV" },
      { name: "tax attorney", value: "high-value", indicator: "HV" },
      { name: "accounting", value: "high-value", indicator: "HV" },
      { name: "tax preparation", value: "high-value", indicator: "HV" },
      { name: "bookkeeping", value: "mid-value", indicator: "MV" },
      { name: "credit repair", value: "high-value", indicator: "HV" },
      { name: "credit repair services", value: "high-value", indicator: "HV" },
      { name: "irs tax relief", value: "high-value", indicator: "HV" },
      { name: "tax debt relief", value: "high-value", indicator: "HV" },
      { name: "back taxes help", value: "high-value", indicator: "HV" },
      { name: "offer in compromise", value: "high-value", indicator: "HV" },
      { name: "tax lien removal", value: "high-value", indicator: "HV" },
      { name: "tax levy release", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "IT & Software Development",
    industries: [
      { name: "software development", value: "high-value", indicator: "HV" },
      { name: "custom software development", value: "high-value", indicator: "HV" },
      { name: "mobile app development", value: "high-value", indicator: "HV" },
      { name: "blockchain developer", value: "high-value", indicator: "HV" },
      { name: "cybersecurity consultant", value: "high-value", indicator: "HV" },
      { name: "web developer", value: "mid-value", indicator: "MV" },
      { name: "web design", value: "mid-value", indicator: "MV" },
      { name: "ecommerce website", value: "mid-value", indicator: "MV" },
      { name: "wordpress", value: "low-value", indicator: "LV" },
      { name: "it support", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Landscaping & Outdoor",
    industries: [
      { name: "tree service", value: "mid-value", indicator: "MV" },
      { name: "tree removal", value: "mid-value", indicator: "MV" },
      { name: "landscaping", value: "mid-value", indicator: "MV" },
      { name: "landscape design", value: "mid-value", indicator: "MV" },
      { name: "lawn care", value: "low-value", indicator: "LV" },
      { name: "lawn mowing", value: "low-value", indicator: "LV" },
      { name: "pressure washing", value: "low-value", indicator: "LV" },
      { name: "garden design", value: "mid-value", indicator: "MV" },
      { name: "hardscaping", value: "mid-value", indicator: "MV" },
      { name: "irrigation installation", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Legal Services",
    industries: [
      { name: "personal injury lawyer", value: "high-value", indicator: "HV" },
      { name: "criminal defense attorney", value: "high-value", indicator: "HV" },
      { name: "dui attorney", value: "high-value", indicator: "HV" },
      { name: "bankruptcy lawyer", value: "high-value", indicator: "HV" },
      { name: "divorce lawyer", value: "high-value", indicator: "HV" },
      { name: "real estate lawyer", value: "high-value", indicator: "HV" },
      { name: "patent attorney", value: "high-value", indicator: "HV" },
      { name: "immigration lawyer", value: "high-value", indicator: "HV" },
      { name: "family law", value: "high-value", indicator: "HV" },
      { name: "estate planning", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Marketing & Advertising",
    industries: [
      { name: "seo services", value: "mid-value", indicator: "MV" },
      { name: "digital marketing", value: "mid-value", indicator: "MV" },
      { name: "ppc management", value: "mid-value", indicator: "MV" },
      { name: "social media marketing", value: "mid-value", indicator: "MV" },
      { name: "social media manager", value: "low-value", indicator: "LV" },
      { name: "email marketing", value: "low-value", indicator: "LV" },
      { name: "content marketing", value: "mid-value", indicator: "MV" },
      { name: "brand strategy", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Pet Services",
    industries: [
      { name: "pet grooming", value: "low-value", indicator: "LV" },
      { name: "dog walker", value: "low-value", indicator: "LV" },
      { name: "pet sitting", value: "low-value", indicator: "LV" },
      { name: "dog training", value: "mid-value", indicator: "MV" },
      { name: "veterinary care", value: "mid-value", indicator: "MV" },
      { name: "pet photography", value: "low-value", indicator: "LV" },
      { name: "aquarium maintenance", value: "low-value", indicator: "LV" },
      { name: "exotic pet care", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Writing & Content",
    industries: [
      { name: "copywriting", value: "low-value", indicator: "LV" },
      { name: "blog writing", value: "low-value", indicator: "LV" },
      { name: "article writing", value: "low-value", indicator: "LV" },
      { name: "proofreading", value: "low-value", indicator: "LV" },
      { name: "transcription", value: "low-value", indicator: "LV" },
      { name: "technical writing", value: "mid-value", indicator: "MV" },
      { name: "ghostwriting", value: "mid-value", indicator: "MV" },
      { name: "content strategy", value: "mid-value", indicator: "MV" },
    ]
  }
];

// Get all industries as a flat list
export const getAllIndustries = (): string[] => {
  return INDUSTRY_PRICING.flatMap(pricing => pricing.industries).sort();
};

/**
 * Get all industries from INDUSTRY_PRICING (for matching keywords to industries)
 */
export const getAllPricingIndustries = (): string[] => {
  return INDUSTRY_PRICING.flatMap(pricing => pricing.industries);
};

/**
 * Find the best matching industry for a keyword using fuzzy/partial matching
 */
export const findMatchingIndustry = (keyword: string): string | null => {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const allIndustries = getAllPricingIndustries();
  
  // 1. Try exact case-insensitive match
  const exactMatch = allIndustries.find(
    ind => ind.toLowerCase() === normalizedKeyword
  );
  if (exactMatch) return exactMatch;
  
  // 2. Try partial matching - check if keyword contains industry name or vice versa
  const partialMatch = allIndustries.find(ind => {
    const normalizedIndustry = ind.toLowerCase();
    // Check if the keyword contains the industry name
    // e.g., "tax attorney" contains "tax" → matches "Tax Law"
    // e.g., "bookkeeping and payroll" contains "bookkeeping" → matches "Bookkeeping"
    return normalizedKeyword.includes(normalizedIndustry) || 
           normalizedIndustry.includes(normalizedKeyword);
  });
  if (partialMatch) return partialMatch;
  
  // 3. Try word-by-word matching
  const keywordWords = normalizedKeyword.split(/\s+/);
  const wordMatch = allIndustries.find(ind => {
    const industryWords = ind.toLowerCase().split(/\s+/);
    // Check if any significant word matches (excluding common words)
    const commonWords = ['and', 'or', 'the', 'a', 'an', 'of', 'for', 'near', 'me', 'services'];
    return keywordWords.some(kw => 
      !commonWords.includes(kw) && kw.length > 2 &&
      industryWords.some(iw => iw.includes(kw) || kw.includes(iw))
    );
  });
  
  return wordMatch || null;
};

/**
 * Determines the lead tier description based on selected industries
 * Returns "Low", "Medium", "High", or combinations like "Low/Medium"
 */
export const getLeadTierDescription = (industries: string[]): string => {
  if (industries.length === 0) return '';
  
  const tiers = new Set<string>();
  
  industries.forEach(industry => {
    const pricing = INDUSTRY_PRICING.find(p => p.industries.includes(industry));
    if (pricing) {
      if (pricing.category === 'low-value') tiers.add('Low');
      if (pricing.category === 'mid-value') tiers.add('Medium');
      if (pricing.category === 'high-value') tiers.add('High');
    }
  });
  
  const tierArray = Array.from(tiers);
  const order = ['Low', 'Medium', 'High'];
  tierArray.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  
  return tierArray.join('/');
};

// Bulk discount calculation for lead credit purchases
export interface BulkDiscountResult {
  originalTotal: number;
  discountOnFirstThousand: number;  // 10% of min($1000, total)
  discountOnExcess: number;         // 20% of max(0, total - $1000)
  totalDiscount: number;
  finalTotal: number;
  savingsPercentage: number;
}

export function calculateBulkDiscount(subtotal: number): BulkDiscountResult {
  const firstTier = Math.min(subtotal, 1000);
  const secondTier = Math.max(0, subtotal - 1000);
  
  const discountOnFirstThousand = firstTier * 0.10;  // 10%
  const discountOnExcess = secondTier * 0.20;        // 20%
  const totalDiscount = discountOnFirstThousand + discountOnExcess;
  const finalTotal = subtotal - totalDiscount;
  
  return {
    originalTotal: subtotal,
    discountOnFirstThousand,
    discountOnExcess,
    totalDiscount,
    finalTotal,
    savingsPercentage: subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0
  };
}
