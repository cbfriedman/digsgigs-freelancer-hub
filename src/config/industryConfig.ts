// Industry-specific configuration for dynamic landing pages
export interface IndustryConfig {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  trustStats: {
    stat1: { value: string; label: string };
    stat2: { value: string; label: string };
    stat3: { value: string; label: string };
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  structuredDataType: string;
}

export const industryConfigs: Record<string, IndustryConfig> = {
  // Default/generic config (no industry param or unknown)
  default: {
    slug: "default",
    name: "Professional",
    headline: "Get Quotes from Local Pros",
    subheadline: "Tell us what you need and we'll connect you with qualified professionals in your area",
    trustStats: {
      stat1: { value: "100%", label: "Free Service" },
      stat2: { value: "24hr", label: "Response Time" },
      stat3: { value: "1000+", label: "Local Pros" },
    },
    seo: {
      title: "Get a Free Quote from Local Pros | DigsandGigs",
      description: "Get a free, no-obligation quote from trusted local professionals in your area. Fast response times, 1000+ verified pros. 100% free service.",
      keywords: "free quote, local professionals, free estimate, professional services",
    },
    structuredDataType: "Professional Services",
  },

  // Home improvement / Contractors
  contractors: {
    slug: "contractors",
    name: "Contractor",
    headline: "Let Contractors Compete for Your Project",
    subheadline: "Get multiple quotes from verified local contractors and save up to 30%",
    trustStats: {
      stat1: { value: "100%", label: "Free Service" },
      stat2: { value: "24hr", label: "Response Time" },
      stat3: { value: "500+", label: "Contractors" },
    },
    seo: {
      title: "Get Free Contractor Quotes | DigsandGigs",
      description: "Get free quotes from verified local contractors for your home improvement project. Compare prices, save money. 100% free service.",
      keywords: "contractor quotes, home improvement, renovation, remodeling, free estimate",
    },
    structuredDataType: "Home Improvement",
  },

  // Mortgage / Real Estate Finance
  mortgage: {
    slug: "mortgage",
    name: "Mortgage Broker",
    headline: "Compare Mortgage Rates from Top Brokers",
    subheadline: "Get personalized rate quotes from licensed mortgage professionals near you",
    trustStats: {
      stat1: { value: "100%", label: "Free Service" },
      stat2: { value: "Same Day", label: "Rate Quotes" },
      stat3: { value: "200+", label: "Lenders" },
    },
    seo: {
      title: "Get Free Mortgage Rate Quotes | DigsandGigs",
      description: "Compare mortgage rates from multiple lenders. Get personalized quotes from licensed mortgage brokers. No obligation, 100% free.",
      keywords: "mortgage rates, mortgage broker, home loan, refinance, mortgage quotes",
    },
    structuredDataType: "Financial Services",
  },

  // Legal Services
  legal: {
    slug: "legal",
    name: "Attorney",
    headline: "Find the Right Attorney for Your Case",
    subheadline: "Get free consultations from experienced lawyers in your area",
    trustStats: {
      stat1: { value: "100%", label: "Free Consult" },
      stat2: { value: "24hr", label: "Response Time" },
      stat3: { value: "300+", label: "Attorneys" },
    },
    seo: {
      title: "Get Free Legal Consultations | DigsandGigs",
      description: "Find experienced attorneys for your legal needs. Get free consultations from qualified lawyers. No obligation, 100% confidential.",
      keywords: "lawyer, attorney, legal consultation, free legal advice, find a lawyer",
    },
    structuredDataType: "Legal Services",
  },

  // Real Estate
  realestate: {
    slug: "realestate",
    name: "Real Estate Agent",
    headline: "Find Top Real Estate Agents Near You",
    subheadline: "Connect with experienced agents who know your local market",
    trustStats: {
      stat1: { value: "100%", label: "Free Service" },
      stat2: { value: "Same Day", label: "Response" },
      stat3: { value: "400+", label: "Agents" },
    },
    seo: {
      title: "Find Top Real Estate Agents | DigsandGigs",
      description: "Connect with top-rated real estate agents in your area. Buy or sell your home with expert guidance. 100% free service.",
      keywords: "real estate agent, realtor, buy home, sell home, real estate",
    },
    structuredDataType: "Real Estate Services",
  },

  // Insurance
  insurance: {
    slug: "insurance",
    name: "Insurance Agent",
    headline: "Compare Insurance Quotes & Save",
    subheadline: "Get personalized quotes from licensed insurance professionals",
    trustStats: {
      stat1: { value: "100%", label: "Free Quotes" },
      stat2: { value: "Minutes", label: "To Compare" },
      stat3: { value: "50+", label: "Carriers" },
    },
    seo: {
      title: "Compare Insurance Quotes | DigsandGigs",
      description: "Compare insurance quotes from top carriers. Get personalized rates for auto, home, life insurance. Save money with free quotes.",
      keywords: "insurance quotes, compare insurance, auto insurance, home insurance, life insurance",
    },
    structuredDataType: "Insurance Services",
  },

  // Financial Planning
  financial: {
    slug: "financial",
    name: "Financial Advisor",
    headline: "Get Expert Financial Guidance",
    subheadline: "Connect with certified financial advisors for personalized planning",
    trustStats: {
      stat1: { value: "100%", label: "Free Consult" },
      stat2: { value: "Certified", label: "Advisors" },
      stat3: { value: "150+", label: "Planners" },
    },
    seo: {
      title: "Find Financial Advisors | DigsandGigs",
      description: "Connect with certified financial advisors for retirement planning, investments, and wealth management. Free initial consultation.",
      keywords: "financial advisor, financial planner, retirement planning, investment advisor, wealth management",
    },
    structuredDataType: "Financial Planning Services",
  },

  // Accounting / Tax
  accounting: {
    slug: "accounting",
    name: "Accountant",
    headline: "Find Trusted CPAs & Tax Professionals",
    subheadline: "Get expert help with taxes, bookkeeping, and financial planning",
    trustStats: {
      stat1: { value: "100%", label: "Free Consult" },
      stat2: { value: "CPA", label: "Certified" },
      stat3: { value: "250+", label: "Accountants" },
    },
    seo: {
      title: "Find CPAs & Tax Professionals | DigsandGigs",
      description: "Connect with certified accountants and tax professionals. Get help with tax preparation, bookkeeping, and business accounting. Free consultation.",
      keywords: "CPA, accountant, tax preparation, bookkeeping, tax professional",
    },
    structuredDataType: "Accounting Services",
  },
};

export function getIndustryConfig(industry: string | null): IndustryConfig {
  if (!industry) return industryConfigs.default;
  const normalizedIndustry = industry.toLowerCase().trim();
  return industryConfigs[normalizedIndustry] || industryConfigs.default;
}
