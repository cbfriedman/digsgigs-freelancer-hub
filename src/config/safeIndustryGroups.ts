/**
 * Safe Industry Groups - ONLY unlicensed, creative, and business support services
 * 
 * This replaces the old INDUSTRY_GROUPS that included licensed professions.
 * All licensed/regulated professions have been removed for legal compliance.
 * 
 * REMOVED CATEGORIES:
 * - Architecture & Engineering (licensed PEs, architects)
 * - Legal Services (attorneys, lawyers)
 * - Financial Services (CPAs, tax attorneys, mortgage brokers)
 * - Insurance (licensed agents/brokers)
 * - Medical & Dental (doctors, therapists, licensed healthcare)
 * - Real Estate (licensed agents/brokers)
 * - Mortgage & Financing (licensed brokers)
 * - Mental Health (licensed therapists, psychologists)
 */

export type SafeIndustryCategory = 'low' | 'mid' | 'high';
export type SafeValueIndicator = 'LV' | 'MV' | 'HV';

export interface SafeIndustryItem {
  name: string;
  value: SafeIndustryCategory;
  indicator: SafeValueIndicator;
  leadPriceCents: number;
}

export interface SafeIndustryGroup {
  categoryName: string;
  industries: SafeIndustryItem[];
}

// Lead prices in cents
const LOW_PRICE = 1000;   // $10
const MID_PRICE = 1500;   // $15
const HIGH_PRICE = 2500;  // $25

export const SAFE_INDUSTRY_GROUPS: SafeIndustryGroup[] = [
  {
    categoryName: "Creative & Design",
    industries: [
      { name: "Graphic Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "UI/UX Designer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Illustrator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Animator", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Brand Designer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Logo Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Package Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Print Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Presentation Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Infographic Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "T-Shirt Designer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Social Media Designer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "3D Designer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
    ]
  },
  {
    categoryName: "Digital Marketing & SEO",
    industries: [
      { name: "SEO Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "PPC Manager", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Social Media Manager", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Content Marketing Specialist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Email Marketing Specialist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Digital Marketing Consultant", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Marketing Analytics Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Facebook Ads Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Google Ads Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "LinkedIn Marketing Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Local SEO Specialist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Growth Hacker", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
    ]
  },
  {
    categoryName: "Web & Software Development",
    industries: [
      { name: "Web Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "WordPress Developer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Shopify Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Mobile App Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Frontend Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Backend Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Full Stack Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "E-commerce Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Webflow Developer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Wix Developer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "No-Code Developer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Automation Developer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
    ]
  },
  {
    categoryName: "Writing & Content",
    industries: [
      { name: "Copywriter", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Blog Writer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Technical Writer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Ghostwriter", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Content Strategist", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "SEO Content Writer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Product Description Writer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Grant Writer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Resume Writer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Editor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Proofreader", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Translator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Transcriptionist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
    ]
  },
  {
    categoryName: "Business Support Services",
    industries: [
      { name: "Virtual Assistant", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Data Entry Specialist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Bookkeeper", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Administrative Assistant", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Customer Service Representative", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Executive Assistant", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Project Coordinator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Research Assistant", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Payroll Specialist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "HR Assistant", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Office Manager", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Lead Generation Specialist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "CRM Specialist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Home Services (Unlicensed)",
    industries: [
      { name: "Handyman", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "House Cleaner", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Lawn Care Specialist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pressure Washer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Window Cleaner", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Gutter Cleaner", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Organizer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Carpet Cleaner", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pool Cleaner", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Landscaper", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Gardener", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Painter (Interior/Exterior)", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Junk Removal Specialist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
    ]
  },
  {
    categoryName: "Pet Services",
    industries: [
      { name: "Dog Walker", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pet Sitter", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pet Groomer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Dog Trainer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Pet Transporter", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Cat Sitter", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pet Waste Removal", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Mobile Pet Groomer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Events & Entertainment",
    industries: [
      { name: "Event Planner", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "DJ", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Event Photographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Videographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Caterer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Bartender", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Wedding Planner", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Florist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Balloon Artist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Face Painter", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Magician", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Musician", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Event Decorator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Tutoring & Education",
    industries: [
      { name: "Math Tutor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "English Tutor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Science Tutor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "SAT/ACT Prep Tutor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Language Tutor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Music Teacher", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Piano Teacher", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Guitar Teacher", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Art Teacher", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Coding Tutor", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Homework Helper", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
    ]
  },
  {
    categoryName: "Fitness & Wellness",
    industries: [
      { name: "Personal Trainer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Yoga Instructor", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Pilates Instructor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Group Fitness Instructor", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Wellness Coach", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Nutrition Coach", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Dance Instructor", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Meditation Teacher", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Life Coach", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Beauty & Personal Care",
    industries: [
      { name: "Hair Stylist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Makeup Artist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Nail Technician", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Barber", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Esthetician", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Lash Technician", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Brow Artist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Personal Stylist", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Hair Braider", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
    ]
  },
  {
    categoryName: "Automotive (Non-Licensed)",
    industries: [
      { name: "Car Detailer", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Mobile Car Wash", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Window Tinter", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Paintless Dent Repair", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Auto Upholstery", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Vehicle Wrap Installer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Moving & Delivery",
    industries: [
      { name: "Moving Helper", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Furniture Assembler", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Delivery Driver", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Packing Specialist", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Hauling Service", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Appliance Mover", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Photography & Video",
    industries: [
      { name: "Portrait Photographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Product Photographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Real Estate Photographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Video Editor", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Drone Photographer", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Wedding Photographer", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
    ]
  },
  {
    categoryName: "Childcare & Senior Support",
    industries: [
      { name: "Babysitter", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Nanny", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Companion Care Provider", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Elder Care Assistant", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Mothers Helper", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Errand Runner", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
    ]
  },
  {
    categoryName: "Skilled Trades Support",
    industries: [
      { name: "CAD Drafter", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Construction Estimator", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Project Coordinator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Construction Admin", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Blueprint Reader", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "3D Modeler", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
      { name: "Interior Design Assistant", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Real Estate Transaction Coordinator", value: "mid", indicator: "MV", leadPriceCents: MID_PRICE },
      { name: "Showing Assistant", value: "low", indicator: "LV", leadPriceCents: LOW_PRICE },
      { name: "Paralegal", value: "high", indicator: "HV", leadPriceCents: HIGH_PRICE },
    ]
  },
];

// Helper to get lead price for a profession from the safe list
export const getSafeLeadPrice = (professionName: string): number => {
  for (const group of SAFE_INDUSTRY_GROUPS) {
    const profession = group.industries.find(
      ind => ind.name.toLowerCase() === professionName.toLowerCase()
    );
    if (profession) {
      return profession.leadPriceCents / 100;
    }
  }
  return 15; // Default to mid-value
};

// Get all safe profession names
export const getAllSafeProfessions = (): string[] => {
  const professions: string[] = [];
  SAFE_INDUSTRY_GROUPS.forEach(group => {
    group.industries.forEach(ind => {
      professions.push(ind.name);
    });
  });
  return professions.sort();
};

// Check if a profession is in the safe list
export const isSafeProfession = (professionName: string): boolean => {
  return SAFE_INDUSTRY_GROUPS.some(group =>
    group.industries.some(
      ind => ind.name.toLowerCase() === professionName.toLowerCase()
    )
  );
};

// List of licensed/regulated professions that are NOT allowed
export const RESTRICTED_PROFESSIONS = [
  // Legal
  'Attorney', 'Lawyer', 'Legal Counsel', 'Barrister', 'Solicitor',
  'Bankruptcy Lawyer', 'Criminal Defense Lawyer', 'Personal Injury Lawyer',
  'Immigration Lawyer', 'Tax Attorney', 'Estate Attorney', 'Real Estate Attorney',
  
  // Financial - Licensed
  'CPA', 'Certified Public Accountant', 'Tax Attorney', 'Financial Advisor',
  'Investment Advisor', 'Wealth Manager', 'Mortgage Broker', 'Loan Officer',
  'Insurance Agent', 'Insurance Broker', 'Securities Broker',
  
  // Real Estate - Licensed
  'Real Estate Agent', 'Realtor', 'Real Estate Broker', 'Property Manager (Licensed)',
  
  // Medical/Healthcare - Licensed
  'Doctor', 'Physician', 'Surgeon', 'Nurse', 'Registered Nurse', 'LPN',
  'Dentist', 'Orthodontist', 'Psychiatrist', 'Psychologist', 'Therapist',
  'Licensed Therapist', 'Licensed Counselor', 'LCSW', 'LMFT',
  'Physical Therapist', 'Occupational Therapist', 'Chiropractor',
  'Pharmacist', 'Optometrist', 'Veterinarian',
  
  // Architecture/Engineering - Licensed
  'Architect', 'Licensed Architect', 'Structural Engineer', 'PE Engineer',
  'Professional Engineer', 'Civil Engineer (PE)', 'Electrical Engineer (PE)',
  
  // Construction - Licensed
  'Licensed Contractor', 'General Contractor (Licensed)', 'Licensed Electrician',
  'Licensed Plumber', 'Licensed HVAC Technician',
];

// Check if a profession is restricted
export const isRestrictedProfession = (professionName: string): boolean => {
  const normalized = professionName.toLowerCase().trim();
  return RESTRICTED_PROFESSIONS.some(
    restricted => normalized.includes(restricted.toLowerCase()) ||
                  restricted.toLowerCase().includes(normalized)
  );
};
