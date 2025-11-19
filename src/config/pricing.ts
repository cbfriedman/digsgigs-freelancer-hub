/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 * VOLUME-BASED CPL PRICING MODEL
 * - Leads 1-10: Standard pricing
 * - Leads 11-50: Reduced pricing (volume discount)
 * - Leads 51+: Best pricing (bulk discount)
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

// Volume-based lead pricing by industry category
// Pricing tiers based on monthly lead volume:
// Free tier (1-10 leads/month): Standard rate
// Pro tier (11-50 leads/month): Volume discount
// Premium tier (51+ leads/month): Best bulk pricing
export const INDUSTRY_PRICING: IndustryPricing[] = [
  {
    category: 'low-value',
    industries: [
      // Home & Local Services
      'Cleaning & Janitorial',
      'Handyman Services',
      'Pet Care & Grooming',
      'Tutoring & Education',
      'Moving & Delivery',
      'Event Planning',
      'Catering',
      'Beauty & Wellness',
      
      // Digital & Creative - Entry Level
      'Data Entry',
      'Virtual Assistant',
      'Transcription',
      'Basic Graphic Design',
      'Photo Editing',
      'Simple Logo Design',
      'Social Media Management',
      'Content Writing',
      'Proofreading',
      'Basic Video Editing',
      'Voice Over',
      'Audio Editing',
      'Product Photography',
      'Resume Writing',
      'Translation'
    ],
    free: 24,   // Standard rate (leads 1-10)
    pro: 16,    // Volume discount (leads 11-50)
    premium: 8  // Best rate (leads 51+)
  },
  {
    category: 'mid-value',
    industries: [
      // Home & Construction Services
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
      'Pool Service',
      
      // Digital & Creative - Professional Level
      'Web Development',
      'WordPress Development',
      'E-commerce Development',
      'Mobile App Development',
      'Software Development',
      'UI/UX Design',
      'Professional Graphic Design',
      'Brand Identity Design',
      'Illustration',
      'Animation',
      '2D Animation',
      '3D Modeling',
      'Video Production',
      'Professional Video Editing',
      'Motion Graphics',
      'Photography',
      'Architectural Rendering',
      
      // Digital Marketing & Business
      'SEO Services',
      'PPC Management',
      'Email Marketing',
      'Copywriting',
      'Content Marketing',
      'Marketing Strategy',
      'Business Consulting',
      'Project Management',
      'Product Management',
      'Data Analysis',
      'Database Design',
      'System Administration',
      'Network Administration',
      'Technical Writing',
      'Game Development',
      'Unity Development',
      'Unreal Engine Development'
    ],
    free: 120,  // Standard rate (leads 1-10)
    pro: 80,    // Volume discount (leads 11-50)
    premium: 40 // Best rate (leads 51+)
  },
  {
    category: 'high-value',
    industries: [
      // Professional Services
      'Legal Services',
      'Patent Law',
      'Corporate Law',
      'Immigration Law',
      'Tax Law',
      'Insurance',
      'Life Insurance',
      'Health Insurance',
      'Financial Planning',
      'Investment Advisory',
      'Wealth Management',
      'Real Estate',
      'Commercial Real Estate',
      'Medical & Dental',
      'Healthcare Consulting',
      'Accounting',
      'Tax Preparation',
      'CPA Services',
      'Business Consulting',
      'Management Consulting',
      'Strategy Consulting',
      
      // High-Value Tech & Engineering
      'Enterprise Software Development',
      'Cloud Architecture',
      'DevOps Consulting',
      'Cybersecurity Consulting',
      'Blockchain Development',
      'AI & Machine Learning',
      'Data Science',
      'Big Data Engineering',
      'IT Consulting',
      'ERP Implementation',
      'Salesforce Development',
      'SAP Consulting',
      
      // Architecture & Engineering
      'Architecture',
      'Structural Engineering',
      'Civil Engineering',
      'Mechanical Engineering',
      'Electrical Engineering',
      'Industrial Design',
      'Patent Illustration',
      
      // Marketing & Advertising - Agency Level
      'Marketing & Advertising',
      'Brand Strategy',
      'Full-Service Marketing',
      'Media Buying',
      'Creative Direction',
      'Public Relations'
    ],
    free: 750,   // Standard rate (leads 1-10)
    pro: 500,    // Volume discount (leads 11-50)
    premium: 250 // Best rate (leads 51+)
  }
];

// Volume-based tier thresholds (NO monthly fees, automatic tier progression)
// Leads 1-10: Free tier pricing
// Leads 11-50: Pro tier pricing  
// Leads 51+: Premium tier pricing
// Resets monthly at midnight EST on last day of month
export const PRICING_TIERS: Record<'free' | 'pro' | 'premium', PricingTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0/month',
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
    price: '$0/month',
    priceValue: 0,
    escrowFee: '5%',
    escrowFeeValue: 5,
    escrowProcessingFee: '5% per payment (min $10)',
    escrowProcessingFeeValue: 0.05,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: '$0/month',
    priceValue: 0,
    escrowFee: '3%',
    escrowFeeValue: 3,
    escrowProcessingFee: '3% per payment (min $10)',
    escrowProcessingFeeValue: 0.03,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
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
