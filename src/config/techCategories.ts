/**
 * Tech-Focused Category Configuration
 * Single source of truth for the 6 top-level categories and their subcategories
 */

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: Subcategory[];
}

// Category UUIDs matching the database
export const CATEGORY_IDS = {
  SOFTWARE_WEB: '11111111-1111-1111-1111-111111111111',
  DESIGN_CREATIVE: '22222222-2222-2222-2222-222222222222',
  MARKETING_GROWTH: '33333333-3333-3333-3333-333333333333',
  AI_AUTOMATION: '44444444-4444-4444-4444-444444444444',
  BUSINESS_SYSTEMS: '55555555-5555-5555-5555-555555555555',
  CONTENT_MEDIA: '66666666-6666-6666-6666-666666666666',
} as const;

export const TECH_CATEGORIES: Category[] = [
  {
    id: CATEGORY_IDS.SOFTWARE_WEB,
    name: 'Software & Web Development',
    slug: 'software-web-development',
    description: 'Web apps, SaaS, mobile, APIs, and technical development',
    subcategories: [
      { id: 'full-stack-development', name: 'Full-Stack Development', slug: 'full-stack-development' },
      { id: 'frontend-development', name: 'Frontend Development (React / Next.js / Vue)', slug: 'frontend-development' },
      { id: 'backend-development', name: 'Backend Development (Node / Laravel / Django)', slug: 'backend-development' },
      { id: 'website-development', name: 'Website Development', slug: 'website-development' },
      { id: 'saas-mvp-development', name: 'SaaS / MVP Development', slug: 'saas-mvp-development' },
      { id: 'api-integrations', name: 'API Integrations', slug: 'api-integrations' },
      { id: 'stripe-payments-integration', name: 'Stripe / Payments Integration', slug: 'stripe-payments-integration' },
      { id: 'performance-optimization', name: 'Performance & Optimization', slug: 'performance-optimization' },
      { id: 'maintenance-bug-fixes', name: 'Maintenance & Bug Fixes', slug: 'maintenance-bug-fixes' },
    ],
  },
  {
    id: CATEGORY_IDS.DESIGN_CREATIVE,
    name: 'Design & Creative',
    slug: 'design-creative',
    description: 'UI/UX, branding, graphics, and visual design',
    subcategories: [
      { id: 'ui-ux-design', name: 'UI / UX Design', slug: 'ui-ux-design' },
      { id: 'web-app-design', name: 'Web & App Design', slug: 'web-app-design' },
      { id: 'brand-identity-logo', name: 'Brand Identity & Logo Design', slug: 'brand-identity-logo' },
      { id: 'pitch-deck-design', name: 'Pitch Deck Design', slug: 'pitch-deck-design' },
      { id: 'marketing-design-assets', name: 'Marketing Design Assets', slug: 'marketing-design-assets' },
      { id: 'product-design-digital', name: 'Product Design (Digital)', slug: 'product-design-digital' },
    ],
  },
  {
    id: CATEGORY_IDS.MARKETING_GROWTH,
    name: 'Marketing & Growth',
    slug: 'marketing-growth',
    description: 'Paid ads, SEO, CRO, email marketing, and analytics',
    subcategories: [
      { id: 'paid-ads-management', name: 'Paid Ads Management (Google / Meta)', slug: 'paid-ads-management' },
      { id: 'seo-audit-implementation', name: 'SEO Audit & Implementation', slug: 'seo-audit-implementation' },
      { id: 'conversion-rate-optimization', name: 'Conversion Rate Optimization (CRO)', slug: 'conversion-rate-optimization' },
      { id: 'email-marketing-setup', name: 'Email Marketing Setup', slug: 'email-marketing-setup' },
      { id: 'analytics-tracking', name: 'Analytics & Tracking (GA4, GTM)', slug: 'analytics-tracking' },
      { id: 'landing-page-optimization', name: 'Landing Page Optimization', slug: 'landing-page-optimization' },
      { id: 'marketing-automation', name: 'Marketing Automation', slug: 'marketing-automation' },
    ],
  },
  {
    id: CATEGORY_IDS.AI_AUTOMATION,
    name: 'AI & Automation',
    slug: 'ai-automation',
    description: 'AI tools, chatbots, workflow automation, and no-code solutions',
    subcategories: [
      { id: 'ai-automation-zapier-make', name: 'AI Automation (Zapier / Make / n8n)', slug: 'ai-automation-zapier-make' },
      { id: 'chatbot-development', name: 'Chatbot Development', slug: 'chatbot-development' },
      { id: 'internal-tools', name: 'Internal Tools', slug: 'internal-tools' },
      { id: 'workflow-automation', name: 'Workflow Automation', slug: 'workflow-automation' },
      { id: 'nocode-lowcode-mvps', name: 'No-Code / Low-Code MVPs', slug: 'nocode-lowcode-mvps' },
      { id: 'ai-integrations', name: 'AI Integrations', slug: 'ai-integrations' },
    ],
  },
  {
    id: CATEGORY_IDS.BUSINESS_SYSTEMS,
    name: 'Business Systems & Operations',
    slug: 'business-systems-operations',
    description: 'CRM, process automation, operations consulting',
    subcategories: [
      { id: 'crm-setup-customization', name: 'CRM Setup & Customization', slug: 'crm-setup-customization' },
      { id: 'notion-airtable-systems', name: 'Notion / Airtable Systems', slug: 'notion-airtable-systems' },
      { id: 'operations-consulting-smb', name: 'Operations Consulting (SMB)', slug: 'operations-consulting-smb' },
      { id: 'process-automation', name: 'Process Automation', slug: 'process-automation' },
      { id: 'bookkeeping-setup', name: 'Bookkeeping Setup (non-tax, non-CPA)', slug: 'bookkeeping-setup' },
    ],
  },
  {
    id: CATEGORY_IDS.CONTENT_MEDIA,
    name: 'Content & Media',
    slug: 'content-media',
    description: 'Copywriting, video editing, podcasting, and content strategy',
    subcategories: [
      { id: 'website-copywriting', name: 'Website Copywriting', slug: 'website-copywriting' },
      { id: 'technical-writing', name: 'Technical Writing', slug: 'technical-writing' },
      { id: 'sales-pages-funnels', name: 'Sales Pages & Funnels', slug: 'sales-pages-funnels' },
      { id: 'video-editing-business', name: 'Video Editing (Business Use)', slug: 'video-editing-business' },
      { id: 'podcast-editing-production', name: 'Podcast Editing & Production', slug: 'podcast-editing-production' },
      { id: 'content-strategy', name: 'Content Strategy (Execution-focused)', slug: 'content-strategy' },
    ],
  },
];

// High-risk keywords for warning system
export const HIGH_RISK_KEYWORDS = {
  financial: [
    'equity', 'rev share', 'revenue share', 'commission only', 'crypto', 'token',
    'nft', 'blockchain', 'investment', 'fundraise', 'trading'
  ],
  legal: [
    'legal', 'lawyer', 'attorney', 'lawsuit', 'immigration', 'compliance', 'contract review'
  ],
  lowSignal: [
    'idea only', 'just an idea', 'no budget', 'unpaid', 'test project',
    'exposure', 'intern', 'volunteer'
  ],
  guarantees: [
    'guaranteed', 'guaranteed results', 'pay per result'
  ],
};

export const HIGH_RISK_WARNING_MESSAGE = 
  "Heads up: projects involving equity, guarantees, or regulated services may receive fewer responses and may be refunded.";

// Helper to get category by ID
export const getCategoryById = (categoryId: string): Category | undefined => {
  return TECH_CATEGORIES.find(cat => cat.id === categoryId);
};

// Helper to get subcategories for a category
export const getSubcategoriesForCategory = (categoryId: string): Subcategory[] => {
  const category = getCategoryById(categoryId);
  return category?.subcategories || [];
};

// Helper to check if text contains high-risk keywords
export const checkHighRiskKeywords = (text: string): { hasRisk: boolean; matchedKeywords: string[] } => {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  
  const allKeywords = [
    ...HIGH_RISK_KEYWORDS.financial,
    ...HIGH_RISK_KEYWORDS.legal,
    ...HIGH_RISK_KEYWORDS.lowSignal,
    ...HIGH_RISK_KEYWORDS.guarantees,
  ];
  
  for (const keyword of allKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  
  return {
    hasRisk: matchedKeywords.length > 0,
    matchedKeywords,
  };
};
