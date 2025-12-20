// Industry-specific specialty mappings
export const INDUSTRY_SPECIALTIES: Record<string, string[]> = {
  "Credit Repair": [
    "Credit Score Improvement",
    "Credit Dispute Services",
    "Credit Restoration",
    "Collection Account Removal",
    "Credit Counseling",
    "Credit Repair for Mortgage",
    "Identity Theft Recovery",
    "Credit Report Analysis"
  ],
  "Tax Relief Services": [
    "IRS Tax Debt Relief",
    "Offer in Compromise",
    "Tax Lien Removal",
    "Tax Levy Release",
    "Tax Penalty Abatement",
    "Back Taxes Help",
    "IRS Debt Settlement",
    "Wage Garnishment Release",
    "State Tax Relief"
  ],
  "Legal Services": [
    "Personal Injury",
    "Family Law",
    "Criminal Defense",
    "Estate Planning",
    "Real Estate Law",
    "Business Law",
    "Immigration Law",
    "Bankruptcy Law",
    "Employment Law",
    "Intellectual Property"
  ],
  "Insurance": [
    "Life Insurance",
    "Health Insurance",
    "Auto Insurance",
    "Home Insurance",
    "Business Insurance",
    "Renters Insurance",
    "Umbrella Insurance",
    "Disability Insurance",
    "Long-Term Care Insurance"
  ],
  "Mortgage & Financing": [
    "Mortgage Brokers",
    "Loan Officers",
    "Refinancing Services",
    "Hard Money Lenders",
    "Business Loan Brokers",
    "Consumer Loan Brokers",
    "Construction Loans",
    "Home Equity Loans",
    "Commercial Lending"
  ],
  "Financial Services & Accounting": [
    "Financial Planning",
    "Investment Advisory",
    "Tax Preparation",
    "Retirement Planning",
    "Wealth Management",
    "CPA Services",
    "Bookkeeping",
    "Tax Attorney",
    "Accounting Services"
  ],
  "Investors": [
    "Angel Investor",
    "Venture Capital",
    "Investment Banker",
    "Accredited Investor",
    "Non-Accredited Investor",
    "Lender",
    "Private Equity",
    "Real Estate Investment",
    "Startup Funding",
    "Growth Capital"
  ],
  "Construction & Home Services": [
    "General Contractor",
    "Electrician",
    "Carpenter",
    "Plumber",
    "Heavy Equipment Operator",
    "Glazier",
    "HVAC Installer",
    "House Painter and Decorator",
    "Roofer",
    "Boilermaker",
    "Construction Inspector",
    "Construction Laborer",
    "Sheet Metal Worker",
    "Concrete Finisher",
    "Elevator Mechanic",
    "Estimator",
    "Carpet Installer",
    "Ironworker",
    "Pipefitter",
    "Surveying",
    "Ceiling Tile Installer",
    "Construction Manager",
    "Mason",
    "Civil Engineer",
    "Architect",
    "Handyman"
  ],
  "Medical & Healthcare": [
    "Primary Care",
    "Urgent Care",
    "Dental",
    "Vision Care",
    "Physical Therapy",
    "Mental Health",
    "Chiropractic",
    "Dermatology",
    "Pediatrics",
    "Surgery"
  ],
  "Technology Services": [
    "Web Development",
    "Mobile App Development",
    "Software Development",
    "IT Support",
    "Cybersecurity",
    "Cloud Services",
    "Data Analytics",
    "UI/UX Design",
    "SEO Services",
    "Digital Marketing"
  ],
  "Business Services": [
    "Accounting",
    "Bookkeeping",
    "Business Consulting",
    "Marketing",
    "HR Services",
    "Legal Services",
    "Virtual Assistant",
    "Project Management",
    "Business Strategy",
    "Process Improvement"
  ],
  "Automotive Services": [
    "Auto Repair",
    "Oil Change",
    "Brake Service",
    "Transmission Repair",
    "Engine Diagnostics",
    "Tire Service",
    "Auto Detailing",
    "Collision Repair",
    "Windshield Repair",
    "Auto Electrical"
  ],
  "Pet Care": [
    "Dog Walking",
    "Pet Sitting",
    "Pet Grooming",
    "Veterinary Care",
    "Dog Training",
    "Pet Boarding",
    "Pet Photography",
    "Pet Transport",
    "Aquarium Maintenance",
    "Exotic Pet Care"
  ],
  "Education & Tutoring": [
    "Math Tutoring",
    "Science Tutoring",
    "English Tutoring",
    "Test Prep",
    "Music Lessons",
    "Art Lessons",
    "Language Lessons",
    "STEM Education",
    "Special Education",
    "Online Tutoring"
  ],
  "Fitness & Wellness": [
    "Personal Training",
    "Yoga Instruction",
    "Pilates",
    "Nutrition Coaching",
    "Massage Therapy",
    "Wellness Coaching",
    "Group Fitness",
    "Sports Training",
    "Weight Loss Coaching",
    "Mental Wellness"
  ],
  "Event Services": [
    "Wedding Photography",
    "Event Photography",
    "Videography",
    "DJ Services",
    "Catering",
    "Event Planning",
    "Floral Design",
    "Venue Rental",
    "Entertainment",
    "Party Rentals"
  ],
  "Cleaning & Maintenance": [
    "House Cleaning",
    "Office Cleaning",
    "Deep Cleaning",
    "Move-Out Cleaning",
    "Carpet Cleaning",
    "Window Cleaning",
    "Pressure Washing",
    "Pool Cleaning",
    "Gutter Cleaning",
    "Lawn Care"
  ],
  "Moving & Storage": [
    "Local Moving",
    "Long Distance Moving",
    "Commercial Moving",
    "Packing Services",
    "Storage Units",
    "Piano Moving",
    "Furniture Moving",
    "Office Relocation",
    "Senior Moving",
    "Junk Removal"
  ],
  "Beauty & Personal Care": [
    "Hair Styling",
    "Hair Coloring",
    "Nail Services",
    "Makeup Services",
    "Facials",
    "Waxing",
    "Massage",
    "Spa Services",
    "Barbering",
    "Skincare"
  ]
};

// Get specialties for a specific industry
export const getIndustrySpecialties = (industry: string): string[] => {
  return INDUSTRY_SPECIALTIES[industry] || [];
};

// Check if an industry has predefined specialties
export const hasIndustrySpecialties = (industry: string): boolean => {
  return industry in INDUSTRY_SPECIALTIES && INDUSTRY_SPECIALTIES[industry].length > 0;
};
