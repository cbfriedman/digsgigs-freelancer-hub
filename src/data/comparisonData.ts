export interface ComparisonFeature {
  feature: string;
  digsandgigs: string | boolean;
  competitor: string | boolean;
  advantage: 'digsandgigs' | 'competitor' | 'tie';
}

export interface Competitor {
  slug: string;
  name: string;
  logo?: string;
  tagline: string;
  description: string;
  targetAudience: string;
  pricingModel: string;
  features: ComparisonFeature[];
  prosDigsAndGigs: string[];
  consDigsAndGigs: string[];
  prosCompetitor: string[];
  consCompetitor: string[];
  verdict: string;
  bestFor: {
    digsandgigs: string;
    competitor: string;
  };
}

export const competitors: Competitor[] = [
  {
    slug: "bark",
    name: "Bark",
    tagline: "DigsAndGigs vs Bark: Which Lead Generation Platform is Right for You?",
    description: "Bark is a UK-based lead generation platform that expanded to the US. They charge professionals per lead, with prices varying by service type and location.",
    targetAudience: "Service professionals seeking leads",
    pricingModel: "Pay-per-lead with credit system",
    features: [
      { feature: "Free to list profile", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Pay only for leads you want", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Verified customer leads", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Lead exclusivity options", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Transparent lead pricing", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "No monthly fees required", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Built-in messaging", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Mobile app", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Escrow payment protection", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "AI-powered matching", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Lead quality guarantee", digsandgigs: true, competitor: false, advantage: "digsandgigs" }
    ],
    prosDigsAndGigs: [
      "Exclusive lead options to reduce competition",
      "Transparent, upfront lead pricing",
      "Escrow protection for large projects",
      "AI matching for better lead quality",
      "Lead return policy for bad leads"
    ],
    consDigsAndGigs: [
      "Newer platform, smaller user base",
      "No mobile app yet",
      "Limited to US market currently"
    ],
    prosCompetitor: [
      "Established brand with large user base",
      "International presence",
      "Mobile app available",
      "Wide range of service categories"
    ],
    consCompetitor: [
      "Lead prices can be unpredictable",
      "High competition per lead (5+ pros)",
      "No exclusivity options",
      "Mixed reviews on lead quality"
    ],
    verdict: "DigsAndGigs is better for pros who want quality over quantity. Our exclusive lead options and transparent pricing help you win more jobs without competing against 5+ other professionals for every lead. Bark has a larger user base but their shared lead model means more competition and lower conversion rates.",
    bestFor: {
      digsandgigs: "Professionals who value lead quality and want exclusive opportunities with transparent pricing",
      competitor: "Professionals comfortable with high-volume, competitive lead environments"
    }
  },
  {
    slug: "thumbtack",
    name: "Thumbtack",
    tagline: "DigsAndGigs vs Thumbtack: Compare Lead Generation Platforms",
    description: "Thumbtack is one of the largest home services marketplaces in the US. They use a lead-based pricing model where professionals pay per customer contact.",
    targetAudience: "Homeowners and service professionals",
    pricingModel: "Pay-per-lead, variable pricing",
    features: [
      { feature: "Free to list profile", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Instant lead matching", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Customer reviews", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Lead exclusivity options", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Predictable lead costs", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "No auto-charge for leads", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Escrow payment protection", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Mobile app", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Large customer base", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Background checks", digsandgigs: true, competitor: true, advantage: "tie" }
    ],
    prosDigsAndGigs: [
      "Choose which leads to purchase (no auto-billing)",
      "Exclusive lead options available",
      "Predictable, transparent pricing",
      "Escrow protection for projects",
      "Better lead-to-job conversion rates"
    ],
    consDigsAndGigs: [
      "Smaller customer base currently",
      "No mobile app yet",
      "Fewer service categories"
    ],
    prosCompetitor: [
      "Massive customer reach",
      "Well-known brand",
      "Full-featured mobile app",
      "Extensive service categories"
    ],
    consCompetitor: [
      "Auto-charges for leads (Instant Match)",
      "High lead costs in competitive markets",
      "5+ pros compete for each lead",
      "Many complaints about lead quality"
    ],
    verdict: "Thumbtack has more customers, but their Instant Match feature auto-charges you for leads you may not want. DigsAndGigs lets you review leads before purchasing, offers exclusive options, and has higher conversion rates because you're not competing against 5+ other pros.",
    bestFor: {
      digsandgigs: "Professionals who want control over lead spending and better conversion rates",
      competitor: "Professionals in areas where Thumbtack has high customer volume"
    }
  },
  {
    slug: "angi",
    name: "Angi (Angie's List)",
    tagline: "DigsAndGigs vs Angi: Which Platform Delivers Better Value?",
    description: "Angi (formerly Angie's List) is a veteran home services platform offering both advertising subscriptions and pay-per-lead options for professionals.",
    targetAudience: "Homeowners seeking vetted professionals",
    pricingModel: "Advertising subscriptions + pay-per-lead",
    features: [
      { feature: "Free basic listing", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "No required monthly fees", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Verified reviews", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Lead exclusivity", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Transparent pricing", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "No long-term contracts", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Escrow protection", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Brand recognition", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Fixed-price services", digsandgigs: false, competitor: true, advantage: "competitor" }
    ],
    prosDigsAndGigs: [
      "No monthly advertising fees required",
      "Exclusive lead options",
      "Transparent, predictable costs",
      "No long-term contracts",
      "Escrow payment protection"
    ],
    consDigsAndGigs: [
      "Less brand recognition",
      "Smaller current user base",
      "No fixed-price booking yet"
    ],
    prosCompetitor: [
      "Strong brand recognition",
      "Large customer base",
      "Fixed-price service booking",
      "Established review system"
    ],
    consCompetitor: [
      "Expensive advertising packages",
      "Long-term contracts common",
      "Hidden fees and upsells",
      "Merged with HomeAdvisor (confusion)"
    ],
    verdict: "Angi pushes expensive advertising packages and often locks pros into contracts. DigsAndGigs has no required monthly fees—you only pay for leads you want. Our transparent pricing and exclusive lead options deliver better ROI for most professionals.",
    bestFor: {
      digsandgigs: "Professionals who want flexible, pay-as-you-go lead generation without contracts",
      competitor: "Established businesses with advertising budgets who want brand exposure"
    }
  },
  {
    slug: "homeadvisor",
    name: "HomeAdvisor",
    tagline: "DigsAndGigs vs HomeAdvisor: Compare Lead Quality and Pricing",
    description: "HomeAdvisor (now part of Angi) is a lead generation platform known for high lead volume but also high costs and aggressive sales tactics.",
    targetAudience: "Homeowners and contractors",
    pricingModel: "Pay-per-lead with annual spend targets",
    features: [
      { feature: "Pay-per-lead model", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "No annual spend requirements", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Lead exclusivity options", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Transparent lead pricing", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Easy to pause/cancel", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "No aggressive upselling", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Lead return policy", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "High lead volume", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "mHelpDesk integration", digsandgigs: false, competitor: true, advantage: "competitor" }
    ],
    prosDigsAndGigs: [
      "No minimum spend requirements",
      "Exclusive leads reduce competition",
      "Transparent, upfront pricing",
      "Easy to pause or cancel anytime",
      "No aggressive sales calls"
    ],
    consDigsAndGigs: [
      "Lower lead volume currently",
      "Fewer tool integrations",
      "Building market presence"
    ],
    prosCompetitor: [
      "High volume of leads",
      "Wide geographic coverage",
      "Business management tools"
    ],
    consCompetitor: [
      "Aggressive sales tactics",
      "Annual spend requirements",
      "Lead costs can be very high ($50-$150+)",
      "Difficult to cancel",
      "Many spam/low-quality leads"
    ],
    verdict: "HomeAdvisor has a reputation for aggressive sales, high costs, and difficult cancellation. Many pros report leads costing $50-$150 with low conversion rates. DigsAndGigs offers transparent pricing, easy cancellation, and exclusive leads that actually convert.",
    bestFor: {
      digsandgigs: "Professionals tired of aggressive upselling who want transparent, quality leads",
      competitor: "Large operations that can absorb high lead costs and want maximum volume"
    }
  },
  {
    slug: "houzz",
    name: "Houzz",
    tagline: "DigsAndGigs vs Houzz: Which Platform Fits Your Business?",
    description: "Houzz is a home design platform that also connects homeowners with professionals. They focus heavily on portfolios and design inspiration.",
    targetAudience: "Design-focused homeowners and pros",
    pricingModel: "Subscription-based advertising",
    features: [
      { feature: "Free profile listing", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "No monthly fees required", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Pay-per-lead option", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Portfolio showcase", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Lead exclusivity", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Design community", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Product marketplace", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Ideabooks/inspiration", digsandgigs: false, competitor: true, advantage: "competitor" }
    ],
    prosDigsAndGigs: [
      "Pay only for leads you want",
      "No required subscription fees",
      "Exclusive lead options",
      "Faster lead response times",
      "Better for all trades, not just design"
    ],
    consDigsAndGigs: [
      "Less design-focused community",
      "No product marketplace",
      "Smaller inspiration gallery"
    ],
    prosCompetitor: [
      "Beautiful portfolio platform",
      "Large design community",
      "Inspiration and ideabooks",
      "Product sourcing tools"
    ],
    consCompetitor: [
      "Expensive Houzz Pro subscription",
      "Best for design trades only",
      "Leads not as actionable",
      "Long sales cycle for customers"
    ],
    verdict: "Houzz is excellent for designers, architects, and remodelers who want to showcase portfolios. But for direct lead generation across all trades, DigsAndGigs is more cost-effective with our pay-per-lead model and exclusive options.",
    bestFor: {
      digsandgigs: "Service professionals across all trades who want direct, actionable leads",
      competitor: "Designers, architects, and remodelers who benefit from visual portfolio marketing"
    }
  },
  {
    slug: "yelp",
    name: "Yelp",
    tagline: "DigsAndGigs vs Yelp: Compare Lead Generation for Service Pros",
    description: "Yelp is primarily a review platform that also offers advertising for local businesses. Their lead generation is tied to their advertising products.",
    targetAudience: "Local consumers and businesses",
    pricingModel: "Advertising-based with lead gen add-ons",
    features: [
      { feature: "Free business listing", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Customer reviews", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "No monthly ad fees required", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Pay-per-lead option", digsandgigs: true, competitor: true, advantage: "tie" },
      { feature: "Lead exclusivity", digsandgigs: true, competitor: false, advantage: "digsandgigs" },
      { feature: "Review manipulation claims", digsandgigs: false, competitor: true, advantage: "digsandgigs" },
      { feature: "Brand recognition", digsandgigs: false, competitor: true, advantage: "competitor" },
      { feature: "Mobile app presence", digsandgigs: false, competitor: true, advantage: "competitor" }
    ],
    prosDigsAndGigs: [
      "No pressure to buy advertising",
      "Transparent lead pricing",
      "Exclusive lead options",
      "Reviews aren't filtered mysteriously",
      "Built specifically for service pros"
    ],
    consDigsAndGigs: [
      "Less consumer brand recognition",
      "Smaller review database",
      "No restaurant/retail categories"
    ],
    prosCompetitor: [
      "Massive brand recognition",
      "Billions of monthly visitors",
      "Established review credibility"
    ],
    consCompetitor: [
      "Controversial review filtering",
      "Expensive advertising required for visibility",
      "Pay-to-play allegations",
      "Not specifically designed for service pros"
    ],
    verdict: "Yelp is a powerful review platform but has faced criticism for their advertising sales tactics and review filtering. DigsAndGigs is built specifically for service professionals with transparent pricing and no mysterious algorithms affecting your visibility.",
    bestFor: {
      digsandgigs: "Service professionals who want a platform built for their industry without advertising pressure",
      competitor: "Businesses where general consumer reviews and Yelp brand recognition drive significant traffic"
    }
  }
];

export const getCompetitorBySlug = (slug: string): Competitor | undefined => {
  return competitors.find(c => c.slug === slug);
};

export const getAllCompetitorSlugs = (): string[] => {
  return competitors.map(c => c.slug);
};
