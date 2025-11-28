/**
 * Centralized Pricing Configuration
 * Single source of truth for all pricing across the platform
 * 
 * EXCLUSIVITY-BASED PRICING MODEL
 * Our pricing is based on lead exclusivity:
 * 
 * - Non-exclusive leads: Bark price - $0.50 (most affordable)
 * - Semi-exclusive leads: Sold to up to 4 people (balanced option)
 * - 24-hour exclusive leads: Premium exclusive access
 * 
 * This model provides clear value differentiation and competitive pricing.
 * 
 * NOTE: Prices fluctuate daily and are subject to change based on market conditions.
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
  nonExclusive: number;  // Bark price - $0.50
  semiExclusive: number; // Sold to up to 4 people
  exclusive24h: number;  // Premium exclusive access
}

export interface PricingTier {
  id: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  name: string;
  exclusivityPeriod: string;
  description: string;
  escrowFee: string;
  escrowFeeValue: number;
  escrowProcessingFee: string;
  escrowProcessingFeeValue: number;
  escrowProcessingMinimum: number;
  priceId: string | null;
  productId: string | null;
  popular: boolean;
}

// Exclusivity-based lead pricing by industry category
// Non-exclusive: Bark price - $0.50
// 24-hour exclusive: Google CPC × 2.5
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
      'Massage Therapy',
      'Nutrition Consulting',
      'Yoga Instruction',
      
      // Digital & Creative - Entry Level
      'Data Entry',
      'Virtual Assistant',
      'Transcription',
      'Basic Graphic Design',
      'Photo Editing',
      'Photo Retouching',
      'Simple Logo Design',
      'Logo Design',
      'Icon Design',
      'Social Media Management',
      'Content Writing',
      'Article Writing',
      'Blog Writing',
      'Copywriting',
      'Creative Writing',
      'Editing',
      'eBook Writing',
      'Press Release Writing',
      'Product Descriptions',
      'Resume Writing',
      'Proofreading',
      'Basic Video Editing',
      'Voice Over',
      'Audio Editing',
      'Product Photography',
      'Real Estate Photography',
      'Translation',
      'Language Tutoring',
      'Book Cover Design',
      'Calligraphy',
      'Infographic Design',
      'Presentation Design',
      'Print Design',
      'T-Shirt Design',
      'Tattoo Design',
      'Vector Tracing',
      
      // IT & Software - Entry Level
      'IT Support',
      'WordPress Development',
      'Website Maintenance',
      
      // Marketing - Entry Level
      'Email Marketing',
    ],
    nonExclusive: 7.50,  // Bark avg (~$8) - $0.50
    semiExclusive: 30.00,  // Sold to up to 4 people
    exclusive24h: 60.00  // Premium exclusive access
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
      
      // Digital & Creative - Professional Level
      'Web Development',
      'Web Design',
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
      'Video Production',
      'Professional Video Editing',
      'Motion Graphics',
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
      'Bookkeeping',
      'Credit Repair',
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
      'Web Development',
      
      // Legal Services - Mid Level
      'Paralegal Services',
      
      // Marketing & Advertising
      'Affiliate Marketing',
      'Brand Strategy',
      'Content Marketing',
      'Digital Marketing',
      'Event Marketing',
      'Google Ads Management',
      'Growth Hacking',
      'Influencer Marketing',
      'Market Research',
      'Marketing Analytics',
      'Marketing Automation',
      'Marketing Consulting',
      'PR & Communications',
      'PPC Management',
      'SEO',
      'SEO Services',
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
      'Marketing Consulting',
      'Sales Consulting',
      'Supply Chain Consulting',
      
      // Architecture & Engineering - Mid Level
      'Interior Architecture',
      'Landscape Architecture',
      'Urban Planning',
    ],
    nonExclusive: 14.50,  // Bark avg (~$15) - $0.50
    semiExclusive: 58.00,   // Sold to up to 4 people
    exclusive24h: 125.00   // Premium exclusive access
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
      'Financial Planning',
      'Investment Advisory',
      'Wealth Management',
      'Loan Brokers',
      'Mortgage Brokers',
      'Estate Planning',
      'Accounting',
      'Tax Preparation',
      'CPA Services',
      
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
      'Brand Consulting',
      'Change Management',
      'Executive Coaching',
      'Financial Consulting',
      'IT Consulting',
      'Management Consulting',
      'Marketing Consulting',
      'Operations Consulting',
      'Risk Management',
      'Strategy Consulting',
      
      // High-Value Tech & Engineering
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
      
      // Marketing & Advertising - Agency Level
      'Marketing & Advertising',
      'Brand Strategy',
      'Full-Service Marketing',
      'Media Buying',
      'Creative Direction',
      'Public Relations',
      
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
    ],
    nonExclusive: 24.50,   // Bark avg (~$25) - $0.50
    semiExclusive: 99.00,   // Sold to up to 4 people
    exclusive24h: 275.00   // Premium exclusive access
  }
];

// Volume-based tier thresholds (NO monthly fees, Bark-based competitive pricing)
// Exclusivity-based pricing tiers (NO monthly fees)
// Non-exclusive: Bark price - $0.50
// Semi-exclusive: Sold to up to 4 people
// Exclusive: Premium exclusive access
export const PRICING_TIERS: Record<'non-exclusive' | 'semi-exclusive' | 'exclusive-24h', PricingTier> = {
  'non-exclusive': {
    id: 'non-exclusive',
    name: 'Non-Exclusive',
    exclusivityPeriod: 'Shared immediately',
    description: 'Most affordable option - Lead shared with other diggers',
    escrowFee: 'Optional 8% (min $10)',
    escrowFeeValue: 0.08,
    escrowProcessingFee: '8%',
    escrowProcessingFeeValue: 0.08,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
    popular: false,
  },
  'semi-exclusive': {
    id: 'semi-exclusive',
    name: 'Semi-Exclusive',
    exclusivityPeriod: 'Shared with up to 4 diggers',
    description: 'Balanced option - Lead shared with up to 3 other diggers',
    escrowFee: 'Optional 8% (min $10)',
    escrowFeeValue: 0.08,
    escrowProcessingFee: '8%',
    escrowProcessingFeeValue: 0.08,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
    popular: true,
  },
  'exclusive-24h': {
    id: 'exclusive-24h',
    name: '24-Hour Exclusive',
    exclusivityPeriod: '24 hours exclusive access',
    description: 'Premium option - You get exclusive access for 24 hours',
    escrowFee: 'Optional 8% (min $10)',
    escrowFeeValue: 0.08,
    escrowProcessingFee: '8%',
    escrowProcessingFeeValue: 0.08,
    escrowProcessingMinimum: 10,
    priceId: null,
    productId: null,
    popular: false,
  },
};

// Helper function to get lead cost for a specific industry and exclusivity type
export const getLeadCostForIndustry = (
  industry: string,
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive',
  isConfirmed: boolean = false
): number => {
  const normalizedIndustry = industry.toLowerCase().trim();
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.some(ind => ind.toLowerCase().trim() === normalizedIndustry)
  );
  
  if (!industryData) {
    // Default to mid-value if industry not found
    const basePrice = exclusivity === 'non-exclusive' 
      ? INDUSTRY_PRICING[1].nonExclusive 
      : exclusivity === 'semi-exclusive'
      ? INDUSTRY_PRICING[1].semiExclusive
      : INDUSTRY_PRICING[1].exclusive24h;
    
    // Add 20% confirmation premium for non-exclusive confirmed leads
    if (exclusivity === 'non-exclusive' && isConfirmed) {
      return Math.round(basePrice * 1.20 * 2) / 2; // Round to nearest $0.50
    }
    
    return basePrice;
  }
  
  const basePrice = exclusivity === 'non-exclusive' 
    ? industryData.nonExclusive 
    : exclusivity === 'semi-exclusive'
    ? industryData.semiExclusive
    : industryData.exclusive24h;
  
  // Add 20% confirmation premium for non-exclusive confirmed leads
  if (exclusivity === 'non-exclusive' && isConfirmed) {
    return Math.round(basePrice * 1.20 * 2) / 2; // Round to nearest $0.50
  }
  
  return basePrice;
};

// Helper function to get industry category
export const getIndustryCategory = (industry: string): IndustryCategory => {
  const normalizedIndustry = industry.toLowerCase().trim();
  const industryData = INDUSTRY_PRICING.find(pricing =>
    pricing.industries.some(ind => ind.toLowerCase().trim() === normalizedIndustry)
  );
  
  return industryData?.category || 'mid-value';
};

export const getPricingTier = (
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h' = 'non-exclusive'
): PricingTier => {
  return PRICING_TIERS[exclusivity];
};

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
    categoryName: "Financial Services",
    industries: [
      { name: "personal injury lawyer", value: "high-value", indicator: "HV" },
      { name: "life insurance", value: "high-value", indicator: "HV" },
      { name: "auto insurance", value: "high-value", indicator: "HV" },
      { name: "health insurance", value: "high-value", indicator: "HV" },
      { name: "home insurance", value: "high-value", indicator: "HV" },
      { name: "mortgage broker", value: "high-value", indicator: "HV" },
      { name: "financial advisor", value: "high-value", indicator: "HV" },
      { name: "investment advisor", value: "high-value", indicator: "HV" },
      { name: "wealth management", value: "high-value", indicator: "HV" },
      { name: "cpa", value: "high-value", indicator: "HV" },
      { name: "tax attorney", value: "high-value", indicator: "HV" },
      { name: "accounting", value: "high-value", indicator: "HV" },
      { name: "tax preparation", value: "high-value", indicator: "HV" },
      { name: "bookkeeping", value: "mid-value", indicator: "MV" },
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
