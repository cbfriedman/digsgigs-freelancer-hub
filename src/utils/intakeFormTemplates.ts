// Industry-specific intake form templates for MV and HV industries
// These will be seeded into the database

export interface FormTemplate {
  industry_name: string;
  description: string;
  questions: {
    question_text: string;
    question_type: 'single-select' | 'multi-select' | 'text' | 'textarea' | 'number' | 'date';
    options?: string[];
    is_required: boolean;
    display_order: number;
  }[];
}

export const MV_INDUSTRY_TEMPLATES: FormTemplate[] = [
  {
    industry_name: "HVAC Installation & Repair",
    description: "Heating, ventilation, and air conditioning services",
    questions: [
      {
        question_text: "What type of HVAC service do you need?",
        question_type: "single-select",
        options: ["New Installation", "Repair/Service", "Replacement", "Maintenance", "Not sure - need consultation"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your property type?",
        question_type: "single-select",
        options: ["Single-family home", "Multi-unit building", "Commercial property", "Industrial facility"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is the approximate square footage?",
        question_type: "single-select",
        options: ["Under 1,500 sq ft", "1,500-2,500 sq ft", "2,500-4,000 sq ft", "Over 4,000 sq ft", "Not sure"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "How urgent is this project?",
        question_type: "single-select",
        options: ["Emergency (within 24 hours)", "Urgent (within 1 week)", "Standard (within 2-4 weeks)", "Flexible timeline"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Please describe any specific issues or requirements",
        question_type: "textarea",
        is_required: false,
        display_order: 5
      }
    ]
  },
  {
    industry_name: "Plumbing Services",
    description: "Residential and commercial plumbing services",
    questions: [
      {
        question_text: "What type of plumbing service do you need?",
        question_type: "single-select",
        options: ["Emergency repair", "Installation", "Routine maintenance", "Inspection", "Drain cleaning", "Water heater service"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your property type?",
        question_type: "single-select",
        options: ["Residential", "Commercial", "Multi-unit"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "How urgent is this service?",
        question_type: "single-select",
        options: ["Emergency (within 24 hours)", "Urgent (within 3 days)", "Standard (within 1-2 weeks)", "Flexible"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe the plumbing issue or project",
        question_type: "textarea",
        is_required: true,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Electrical Services",
    description: "Licensed electrical work for residential and commercial",
    questions: [
      {
        question_text: "What type of electrical work do you need?",
        question_type: "single-select",
        options: ["New installation", "Repair", "Upgrade/Replacement", "Inspection", "Emergency service", "Panel upgrade"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your property type?",
        question_type: "single-select",
        options: ["Residential", "Commercial", "Industrial"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "How urgent is this project?",
        question_type: "single-select",
        options: ["Emergency (same day)", "Urgent (within 3 days)", "Standard (within 2 weeks)", "Flexible"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe the electrical work needed",
        question_type: "textarea",
        is_required: true,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Roofing Services",
    description: "Roof repair, replacement, and installation",
    questions: [
      {
        question_text: "What type of roofing service do you need?",
        question_type: "single-select",
        options: ["Full roof replacement", "Repair", "New construction", "Inspection", "Emergency repair"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your roof type?",
        question_type: "single-select",
        options: ["Asphalt shingles", "Metal", "Tile", "Flat/Commercial", "Not sure"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is your property type?",
        question_type: "single-select",
        options: ["Single-family home", "Multi-unit building", "Commercial"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "How urgent is this project?",
        question_type: "single-select",
        options: ["Emergency (active leak)", "Urgent (within 2 weeks)", "Standard (within 1-2 months)", "Planning ahead"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Please describe any specific issues or requirements",
        question_type: "textarea",
        is_required: false,
        display_order: 5
      }
    ]
  },
  {
    industry_name: "Landscaping & Lawn Care",
    description: "Outdoor design, maintenance, and installation",
    questions: [
      {
        question_text: "What type of landscaping service do you need?",
        question_type: "multi-select",
        options: ["Lawn maintenance", "Landscape design", "Hardscaping", "Tree/Shrub care", "Irrigation", "Cleanup"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your property size?",
        question_type: "single-select",
        options: ["Small (under 1/4 acre)", "Medium (1/4 to 1/2 acre)", "Large (1/2 to 1 acre)", "Very large (over 1 acre)"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "How often do you need service?",
        question_type: "single-select",
        options: ["One-time project", "Weekly", "Bi-weekly", "Monthly", "Seasonal"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe your landscaping needs",
        question_type: "textarea",
        is_required: true,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Kitchen & Bathroom Remodeling",
    description: "Full-service remodeling and renovation",
    questions: [
      {
        question_text: "Which rooms are you remodeling?",
        question_type: "multi-select",
        options: ["Kitchen", "Master bathroom", "Guest bathroom", "Multiple rooms"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is the scope of your remodel?",
        question_type: "single-select",
        options: ["Complete remodel", "Partial remodel", "Cosmetic updates", "Specific features only"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is your budget range?",
        question_type: "single-select",
        options: ["Under $10,000", "$10,000-$25,000", "$25,000-$50,000", "$50,000-$100,000", "Over $100,000"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "When would you like to start?",
        question_type: "single-select",
        options: ["Immediately", "Within 1 month", "Within 3 months", "Within 6 months", "Just planning"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Please describe your vision and specific requirements",
        question_type: "textarea",
        is_required: false,
        display_order: 5
      }
    ]
  },
  {
    industry_name: "Web Development & Design",
    description: "Custom websites and web applications",
    questions: [
      {
        question_text: "What type of website do you need?",
        question_type: "single-select",
        options: ["Business website", "E-commerce", "Web application", "Portfolio", "Blog", "Landing page"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "Do you need these features?",
        question_type: "multi-select",
        options: ["Custom design", "Content management system", "E-commerce", "User accounts", "Mobile app", "API integration"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is your budget range?",
        question_type: "single-select",
        options: ["Under $5,000", "$5,000-$15,000", "$15,000-$50,000", "$50,000+"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "When do you need the project completed?",
        question_type: "single-select",
        options: ["Within 1 month", "1-3 months", "3-6 months", "Flexible timeline"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Please describe your project requirements",
        question_type: "textarea",
        is_required: true,
        display_order: 5
      }
    ]
  }
];

export const HV_INDUSTRY_TEMPLATES: FormTemplate[] = [
  {
    industry_name: "Legal Services",
    description: "Licensed legal representation and consultation",
    questions: [
      {
        question_text: "What type of legal service do you need?",
        question_type: "single-select",
        options: ["Business law", "Personal injury", "Estate planning", "Real estate", "Family law", "Criminal defense", "Other"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "How urgent is this matter?",
        question_type: "single-select",
        options: ["Emergency (immediate)", "Urgent (within 1 week)", "Standard (within 1 month)", "Consultation only"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "Have you worked with an attorney on this matter before?",
        question_type: "single-select",
        options: ["Yes", "No"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please briefly describe your legal situation (confidential)",
        question_type: "textarea",
        is_required: true,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Financial Planning & Investment",
    description: "Certified financial advisors and wealth management",
    questions: [
      {
        question_text: "What financial planning services are you interested in?",
        question_type: "multi-select",
        options: ["Retirement planning", "Investment management", "Tax planning", "Estate planning", "Insurance review", "Debt management"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your approximate household income?",
        question_type: "single-select",
        options: ["Under $100,000", "$100,000-$250,000", "$250,000-$500,000", "$500,000+", "Prefer not to say"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What are your main financial goals?",
        question_type: "multi-select",
        options: ["Retirement planning", "Wealth building", "Tax optimization", "College savings", "Estate planning", "Risk management"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "When would you like to start working with an advisor?",
        question_type: "single-select",
        options: ["Immediately", "Within 1 month", "Within 3 months", "Just exploring options"],
        is_required: true,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Real Estate Agent Services",
    description: "Licensed real estate agents for buying and selling",
    questions: [
      {
        question_text: "What type of real estate service do you need?",
        question_type: "single-select",
        options: ["Buying a home", "Selling a home", "Both buying and selling", "Investment properties", "Commercial real estate"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your timeline?",
        question_type: "single-select",
        options: ["Ready now", "Within 3 months", "Within 6 months", "Within 1 year", "Just researching"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is your budget range?",
        question_type: "single-select",
        options: ["Under $300,000", "$300,000-$500,000", "$500,000-$750,000", "$750,000-$1,000,000", "Over $1,000,000"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe your ideal property or selling situation",
        question_type: "textarea",
        is_required: false,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Insurance Services",
    description: "Licensed insurance agents and brokers",
    questions: [
      {
        question_text: "What type of insurance are you looking for?",
        question_type: "multi-select",
        options: ["Life insurance", "Health insurance", "Auto insurance", "Home insurance", "Business insurance", "Disability insurance"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "Are you looking for new coverage or comparing existing policies?",
        question_type: "single-select",
        options: ["New coverage", "Compare/Switch providers", "Add coverage to existing", "Policy review"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "How soon do you need coverage?",
        question_type: "single-select",
        options: ["Immediately", "Within 1 month", "Within 3 months", "Just comparing options"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe your insurance needs or questions",
        question_type: "textarea",
        is_required: false,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Dental Services",
    description: "General dentistry and specialized dental care",
    questions: [
      {
        question_text: "What type of dental service do you need?",
        question_type: "single-select",
        options: ["General checkup/cleaning", "Cosmetic dentistry", "Dental emergency", "Orthodontics", "Oral surgery", "Restorative work"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "How urgent is your dental need?",
        question_type: "single-select",
        options: ["Emergency (pain/injury)", "Soon (within 1 week)", "Routine (within 1 month)", "Planning ahead"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "Do you have dental insurance?",
        question_type: "single-select",
        options: ["Yes", "No", "Not sure"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "Please describe your dental concerns or desired treatment",
        question_type: "textarea",
        is_required: false,
        display_order: 4
      }
    ]
  },
  {
    industry_name: "Solar Panel Installation",
    description: "Residential and commercial solar energy systems",
    questions: [
      {
        question_text: "What type of property will have solar panels?",
        question_type: "single-select",
        options: ["Single-family home", "Multi-unit residential", "Commercial building", "Industrial facility"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your approximate monthly electric bill?",
        question_type: "single-select",
        options: ["Under $100", "$100-$200", "$200-$400", "$400-$600", "Over $600"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is your main motivation for going solar?",
        question_type: "multi-select",
        options: ["Lower energy costs", "Environmental impact", "Energy independence", "Increase home value", "Tax incentives"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "What is your timeline for installation?",
        question_type: "single-select",
        options: ["Within 3 months", "Within 6 months", "Within 1 year", "Just researching"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Do you own your property?",
        question_type: "single-select",
        options: ["Yes, I own", "No, I rent", "Other arrangement"],
        is_required: true,
        display_order: 5
      }
    ]
  }
];

export const ALL_FORM_TEMPLATES = [...MV_INDUSTRY_TEMPLATES, ...HV_INDUSTRY_TEMPLATES];
