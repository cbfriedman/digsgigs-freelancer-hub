// Keyword suggestions based on professions and categories
export const professionKeywords: Record<string, string[]> = {
  plumber: [
    "residential plumbing",
    "commercial plumbing",
    "pipe repair",
    "drain cleaning",
    "water heater",
    "emergency plumbing",
    "leak detection",
    "fixture installation",
    "sewer line",
    "backflow prevention"
  ],
  electrician: [
    "residential electrical",
    "commercial electrical",
    "wiring",
    "panel upgrade",
    "lighting installation",
    "outlet repair",
    "circuit breaker",
    "emergency electrical",
    "code compliance",
    "energy efficiency"
  ],
  carpenter: [
    "framing",
    "finish carpentry",
    "cabinet installation",
    "deck building",
    "door installation",
    "window installation",
    "trim work",
    "custom woodwork",
    "structural repair",
    "remodeling"
  ],
  painter: [
    "interior painting",
    "exterior painting",
    "residential painting",
    "commercial painting",
    "cabinet refinishing",
    "drywall repair",
    "pressure washing",
    "deck staining",
    "wallpaper removal",
    "color consultation"
  ],
  hvac: [
    "air conditioning",
    "heating repair",
    "furnace installation",
    "ac installation",
    "ductwork",
    "emergency hvac",
    "maintenance plans",
    "thermostat installation",
    "air quality",
    "energy efficiency"
  ],
  landscaper: [
    "lawn care",
    "landscape design",
    "hardscaping",
    "irrigation",
    "tree trimming",
    "mulching",
    "seasonal cleanup",
    "lawn maintenance",
    "garden installation",
    "outdoor lighting"
  ],
  roofer: [
    "roof repair",
    "roof replacement",
    "shingle installation",
    "flat roofing",
    "gutter installation",
    "emergency roof repair",
    "roof inspection",
    "leak repair",
    "metal roofing",
    "commercial roofing"
  ],
  contractor: [
    "general contracting",
    "home renovation",
    "remodeling",
    "kitchen remodel",
    "bathroom remodel",
    "additions",
    "new construction",
    "project management",
    "building permits",
    "code compliance"
  ],
  lawyer: [
    "litigation",
    "contract law",
    "family law",
    "criminal defense",
    "personal injury",
    "estate planning",
    "business law",
    "real estate law",
    "civil litigation",
    "consultation",
    "legal representation",
    "court proceedings"
  ],
  attorney: [
    "litigation",
    "contract law",
    "family law",
    "criminal defense",
    "personal injury",
    "estate planning",
    "business law",
    "real estate law",
    "civil litigation",
    "consultation",
    "legal representation",
    "court proceedings"
  ],
  accountant: [
    "tax preparation",
    "bookkeeping",
    "financial planning",
    "audit services",
    "payroll services",
    "business consulting",
    "tax consulting",
    "financial statements",
    "small business",
    "corporate tax"
  ],
  consultant: [
    "business consulting",
    "management consulting",
    "strategic planning",
    "process improvement",
    "project management",
    "analysis",
    "recommendations",
    "implementation",
    "training"
  ],
  photographer: [
    "wedding photography",
    "portrait photography",
    "commercial photography",
    "event photography",
    "product photography",
    "real estate photography",
    "photo editing",
    "digital photography",
    "studio sessions"
  ],
  designer: [
    "graphic design",
    "web design",
    "logo design",
    "brand identity",
    "UI/UX design",
    "print design",
    "digital design",
    "creative services",
    "design consultation"
  ],
  cleaner: [
    "residential cleaning",
    "commercial cleaning",
    "deep cleaning",
    "move-out cleaning",
    "carpet cleaning",
    "window cleaning",
    "post-construction cleaning",
    "recurring service",
    "eco-friendly products"
  ],
  mechanic: [
    "auto repair",
    "engine diagnostics",
    "brake service",
    "oil change",
    "transmission repair",
    "electrical systems",
    "preventive maintenance",
    "tire service",
    "inspection"
  ],
  "angel investor": [
    "startup funding",
    "seed capital",
    "equity investment",
    "early-stage funding",
    "startup mentorship",
    "investment portfolio",
    "due diligence",
    "term sheets",
    "valuation",
    "investment thesis"
  ],
  "venture capital": [
    "growth capital",
    "series funding",
    "portfolio management",
    "institutional investment",
    "VC funding",
    "investment committee",
    "deal sourcing",
    "exit strategy",
    "board seats",
    "fund management"
  ],
  "investment banker": [
    "mergers and acquisitions",
    "M&A advisory",
    "capital raising",
    "IPO services",
    "financial restructuring",
    "valuation services",
    "debt financing",
    "equity financing",
    "transaction advisory",
    "corporate finance"
  ],
  "accredited investor": [
    "private equity",
    "hedge funds",
    "alternative investments",
    "investment opportunities",
    "qualified investments",
    "portfolio diversification",
    "wealth management",
    "high net worth",
    "investment strategies",
    "asset allocation"
  ],
  "non-accredited investor": [
    "retail investing",
    "crowdfunding",
    "public markets",
    "investment education",
    "mutual funds",
    "ETFs",
    "index funds",
    "401k investments",
    "IRA investments",
    "accessible investments"
  ],
  lender: [
    "business loans",
    "commercial lending",
    "real estate loans",
    "mortgage lending",
    "equipment financing",
    "working capital",
    "credit lines",
    "term loans",
    "SBA loans",
    "hard money loans"
  ]
};

export const categoryKeywords: Record<string, string[]> = {
  construction: [
    "new construction",
    "renovation",
    "remodeling",
    "structural work",
    "foundation",
    "framing",
    "concrete work",
    "demolition"
  ],
  plumbing: [
    "pipe installation",
    "drain cleaning",
    "water systems",
    "sewage systems",
    "fixture repair",
    "leak detection"
  ],
  electrical: [
    "wiring installation",
    "panel upgrades",
    "lighting systems",
    "generator installation",
    "smart home",
    "security systems"
  ],
  hvac: [
    "heating systems",
    "cooling systems",
    "ventilation",
    "air quality",
    "ductwork",
    "thermostat"
  ],
  landscaping: [
    "lawn maintenance",
    "landscape design",
    "irrigation systems",
    "hardscaping",
    "tree services",
    "outdoor lighting"
  ],
  roofing: [
    "roof installation",
    "roof repair",
    "gutter systems",
    "waterproofing",
    "shingle work",
    "flat roofs"
  ],
  painting: [
    "interior painting",
    "exterior painting",
    "decorative finishes",
    "pressure washing",
    "surface preparation",
    "color matching"
  ],
  flooring: [
    "hardwood flooring",
    "tile installation",
    "carpet installation",
    "laminate flooring",
    "floor refinishing",
    "floor repair"
  ],
  investors: [
    "capital investment",
    "funding opportunities",
    "investment deals",
    "financial backing",
    "investor relations",
    "investment terms",
    "funding rounds",
    "investment agreements",
    "capital allocation",
    "investment returns"
  ]
};

// Generate keyword suggestions based on profession and categories
export const generateKeywordSuggestions = (
  profession: string,
  categoryNames: string[]
): string[] => {
  const suggestions: Set<string> = new Set();
  
  // Add profession-specific keywords
  const professionKey = profession.toLowerCase().trim();
  if (professionKeywords[professionKey]) {
    professionKeywords[professionKey].forEach(kw => suggestions.add(kw));
  }
  
  // Add category-specific keywords
  categoryNames.forEach(categoryName => {
    const categoryKey = categoryName.toLowerCase().trim();
    if (categoryKeywords[categoryKey]) {
      categoryKeywords[categoryKey].forEach(kw => suggestions.add(kw));
    }
  });
  
  // If no specific matches, provide generic suggestions
  if (suggestions.size === 0) {
    [
      "licensed",
      "insured",
      "bonded",
      "experienced",
      "professional",
      "reliable",
      "quality work",
      "competitive pricing",
      "free estimates",
      "residential",
      "commercial",
      "emergency services"
    ].forEach(kw => suggestions.add(kw));
  }
  
  return Array.from(suggestions);
};
