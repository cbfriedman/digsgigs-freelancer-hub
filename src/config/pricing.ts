/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 * VOLUME-BASED CPL PRICING MODEL
 * - Leads 1-10: Standard pricing
 * - Leads 11-50: Reduced pricing (volume discount)
 * - Leads 51+: Best pricing (bulk discount)
 */

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
    free: 24,   // 3x CPC (leads 1-10)
    pro: 20,    // 2.5x CPC (leads 11-50)
    premium: 16 // 2x CPC (leads 51+)
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
    free: 120,  // 3x CPC (leads 1-10)
    pro: 100,   // 2.5x CPC (leads 11-50)
    premium: 80 // 2x CPC (leads 51+)
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
    free: 750,   // 3x CPC (leads 1-10)
    pro: 625,    // 2.5x CPC (leads 11-50)
    premium: 500 // 2x CPC (leads 51+)
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
    escrowFee: '8%',
    escrowFeeValue: 8,
    escrowProcessingFee: '8% per payment (min $10)',
    escrowProcessingFeeValue: 0.08,
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
    escrowFee: '8%',
    escrowFeeValue: 8,
    escrowProcessingFee: '8% per payment (min $10)',
    escrowProcessingFeeValue: 0.08,
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
    escrowFee: '8%',
    escrowFeeValue: 8,
    escrowProcessingFee: '8% per payment (min $10)',
    escrowProcessingFeeValue: 0.08,
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

// Hierarchical industry structure for UI display
export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    categoryName: "Architecture & Engineering",
    industries: [
      { name: "Architecture", value: "high-value", indicator: "HV" },
      { name: "Civil Engineering", value: "high-value", indicator: "HV" },
      { name: "Electrical Engineering", value: "high-value", indicator: "HV" },
      { name: "Industrial Design", value: "high-value", indicator: "HV" },
      { name: "Mechanical Engineering", value: "high-value", indicator: "HV" },
      { name: "Structural Engineering", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Business & Consulting",
    industries: [
      { name: "Business Consulting", value: "high-value", indicator: "HV" },
      { name: "Management Consulting", value: "high-value", indicator: "HV" },
      { name: "Strategy Consulting", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Construction & Home Services",
    industries: [
      { name: "Appliance Repair", value: "mid-value", indicator: "MV" },
      { name: "Carpentry", value: "mid-value", indicator: "MV" },
      { name: "Concrete Work", value: "mid-value", indicator: "MV" },
      { name: "Electrical", value: "mid-value", indicator: "MV" },
      { name: "Fencing", value: "mid-value", indicator: "MV" },
      { name: "Flooring", value: "mid-value", indicator: "MV" },
      { name: "General Contracting", value: "mid-value", indicator: "MV" },
      { name: "HVAC", value: "mid-value", indicator: "MV" },
      { name: "Masonry", value: "mid-value", indicator: "MV" },
      { name: "Painting", value: "mid-value", indicator: "MV" },
      { name: "Plumbing", value: "mid-value", indicator: "MV" },
      { name: "Roofing", value: "mid-value", indicator: "MV" },
      { name: "Windows & Doors", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Creative & Design",
    industries: [
      { name: "2D Animation", value: "mid-value", indicator: "MV" },
      { name: "3D Modeling", value: "mid-value", indicator: "MV" },
      { name: "Animation", value: "mid-value", indicator: "MV" },
      { name: "Architectural Rendering", value: "mid-value", indicator: "MV" },
      { name: "Audio Editing", value: "low-value", indicator: "LV" },
      { name: "Basic Graphic Design", value: "low-value", indicator: "LV" },
      { name: "Brand Identity Design", value: "mid-value", indicator: "MV" },
      { name: "Illustration", value: "mid-value", indicator: "MV" },
      { name: "Motion Graphics", value: "mid-value", indicator: "MV" },
      { name: "Patent Illustration", value: "high-value", indicator: "HV" },
      { name: "Photo Editing", value: "low-value", indicator: "LV" },
      { name: "Photography", value: "mid-value", indicator: "MV" },
      { name: "Product Photography", value: "low-value", indicator: "LV" },
      { name: "Professional Graphic Design", value: "mid-value", indicator: "MV" },
      { name: "Professional Video Editing", value: "mid-value", indicator: "MV" },
      { name: "Simple Logo Design", value: "low-value", indicator: "LV" },
      { name: "UI/UX Design", value: "mid-value", indicator: "MV" },
      { name: "Video Production", value: "mid-value", indicator: "MV" },
      { name: "Voice Over", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Data & Analytics",
    industries: [
      { name: "Big Data Engineering", value: "high-value", indicator: "HV" },
      { name: "Data Analysis", value: "mid-value", indicator: "MV" },
      { name: "Data Entry", value: "low-value", indicator: "LV" },
      { name: "Data Science", value: "high-value", indicator: "HV" },
      { name: "Database Design", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Financial Services",
    industries: [
      { name: "Accounting", value: "high-value", indicator: "HV" },
      { name: "CPA Services", value: "high-value", indicator: "HV" },
      { name: "Financial Planning", value: "high-value", indicator: "HV" },
      { name: "Investment Advisory", value: "high-value", indicator: "HV" },
      { name: "Tax Preparation", value: "high-value", indicator: "HV" },
      { name: "Wealth Management", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Home & Local Services",
    industries: [
      { name: "Auto Repair", value: "mid-value", indicator: "MV" },
      { name: "Beauty & Wellness", value: "low-value", indicator: "LV" },
      { name: "Catering", value: "low-value", indicator: "LV" },
      { name: "Cleaning & Janitorial", value: "low-value", indicator: "LV" },
      { name: "Event Planning", value: "low-value", indicator: "LV" },
      { name: "Handyman Services", value: "low-value", indicator: "LV" },
      { name: "Landscaping", value: "mid-value", indicator: "MV" },
      { name: "Moving & Delivery", value: "low-value", indicator: "LV" },
      { name: "Pest Control", value: "mid-value", indicator: "MV" },
      { name: "Pet Care & Grooming", value: "low-value", indicator: "LV" },
      { name: "Pool Service", value: "mid-value", indicator: "MV" },
      { name: "Tree Service", value: "mid-value", indicator: "MV" },
      { name: "Tutoring & Education", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Insurance",
    industries: [
      { name: "Health Insurance", value: "high-value", indicator: "HV" },
      { name: "Insurance", value: "high-value", indicator: "HV" },
      { name: "Life Insurance", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "IT & Technology",
    industries: [
      { name: "AI & Machine Learning", value: "high-value", indicator: "HV" },
      { name: "Blockchain Development", value: "high-value", indicator: "HV" },
      { name: "Cloud Architecture", value: "high-value", indicator: "HV" },
      { name: "Cybersecurity Consulting", value: "high-value", indicator: "HV" },
      { name: "DevOps Consulting", value: "high-value", indicator: "HV" },
      { name: "Enterprise Software Development", value: "high-value", indicator: "HV" },
      { name: "ERP Implementation", value: "high-value", indicator: "HV" },
      { name: "IT Consulting", value: "high-value", indicator: "HV" },
      { name: "Network Administration", value: "mid-value", indicator: "MV" },
      { name: "Salesforce Development", value: "high-value", indicator: "HV" },
      { name: "SAP Consulting", value: "high-value", indicator: "HV" },
      { name: "System Administration", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Legal Services",
    industries: [
      { name: "Corporate Law", value: "high-value", indicator: "HV" },
      { name: "Immigration Law", value: "high-value", indicator: "HV" },
      { name: "Legal Services", value: "high-value", indicator: "HV" },
      { name: "Patent Law", value: "high-value", indicator: "HV" },
      { name: "Tax Law", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Marketing & Advertising",
    industries: [
      { name: "Brand Strategy", value: "high-value", indicator: "HV" },
      { name: "Content Marketing", value: "mid-value", indicator: "MV" },
      { name: "Copywriting", value: "mid-value", indicator: "MV" },
      { name: "Creative Direction", value: "high-value", indicator: "HV" },
      { name: "Email Marketing", value: "mid-value", indicator: "MV" },
      { name: "Full-Service Marketing", value: "high-value", indicator: "HV" },
      { name: "Marketing & Advertising", value: "high-value", indicator: "HV" },
      { name: "Marketing Strategy", value: "mid-value", indicator: "MV" },
      { name: "Media Buying", value: "high-value", indicator: "HV" },
      { name: "PPC Management", value: "mid-value", indicator: "MV" },
      { name: "Public Relations", value: "high-value", indicator: "HV" },
      { name: "SEO Services", value: "mid-value", indicator: "MV" },
      { name: "Social Media Management", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Medical & Healthcare",
    industries: [
      { name: "Healthcare Consulting", value: "high-value", indicator: "HV" },
      { name: "Medical & Dental", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Real Estate",
    industries: [
      { name: "Commercial Real Estate", value: "high-value", indicator: "HV" },
      { name: "Real Estate", value: "high-value", indicator: "HV" },
    ]
  },
  {
    categoryName: "Software Development",
    industries: [
      { name: "E-commerce Development", value: "mid-value", indicator: "MV" },
      { name: "Game Development", value: "mid-value", indicator: "MV" },
      { name: "Mobile App Development", value: "mid-value", indicator: "MV" },
      { name: "Software Development", value: "mid-value", indicator: "MV" },
      { name: "Unity Development", value: "mid-value", indicator: "MV" },
      { name: "Unreal Engine Development", value: "mid-value", indicator: "MV" },
      { name: "Web Development", value: "mid-value", indicator: "MV" },
      { name: "WordPress Development", value: "mid-value", indicator: "MV" },
    ]
  },
  {
    categoryName: "Writing & Content",
    industries: [
      { name: "Content Writing", value: "low-value", indicator: "LV" },
      { name: "Proofreading", value: "low-value", indicator: "LV" },
      { name: "Resume Writing", value: "low-value", indicator: "LV" },
      { name: "Technical Writing", value: "mid-value", indicator: "MV" },
      { name: "Transcription", value: "low-value", indicator: "LV" },
      { name: "Translation", value: "low-value", indicator: "LV" },
      { name: "Virtual Assistant", value: "low-value", indicator: "LV" },
    ]
  },
  {
    categoryName: "Other Services",
    industries: [
      { name: "Business Consulting", value: "mid-value", indicator: "MV" },
      { name: "Product Management", value: "mid-value", indicator: "MV" },
      { name: "Project Management", value: "mid-value", indicator: "MV" },
    ]
  }
];

// Get all industries as a flat list
export const getAllIndustries = (): string[] => {
  return INDUSTRY_PRICING.flatMap(pricing => pricing.industries).sort();
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
