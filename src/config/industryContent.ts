// Industry-specific content for UI display
// Used in Digger signup and Gigger project posting flows

export interface IndustryContentConfig {
  diggerBlurb?: {
    title: string;
    body: string;
  };
  giggerPrompt?: {
    heading: string;
    body: string;
    bulletPoints?: string[];
  };
  disclaimer?: string;
  legalDisclaimer?: string;
  seo?: {
    title: string;
    metaDescription: string;
    keywords?: string;
  };
  // SEO for specific page types
  diggerSignupSeo?: {
    title: string;
    metaDescription: string;
  };
  giggerPostingSeo?: {
    title: string;
    metaDescription: string;
  };
  categoryDescription?: string;
}

// Map industry slugs to their content configurations
export const industryContent: Record<string, IndustryContentConfig> = {
  "venture-capital-startup-funding-support": {
    categoryDescription: `Venture Capital & Startup Funding Support

Connect with experienced advisors who help founders prepare for fundraising. These professionals offer pitch coaching, capital-raise strategy, investor relations support, and grant funding guidance.

Digs & Gigs does not broker investments or sell securities. All fundraising and investment decisions happen directly between you and your advisor.`,
    diggerBlurb: {
      title: "Who should choose this category?",
      body: "Select Venture Capital & Startup Funding Support if you advise founders on raising capital — including pitch decks, fundraising strategy, investor outreach, or grant funding.\n\nIf you are a licensed broker-dealer or regulated investment professional, please do not use Digs & Gigs to solicit or sell securities."
    },
    giggerPrompt: {
      heading: "Need help raising money for your startup?",
      body: "Post a project under Venture Capital & Startup Funding Support to get help with:",
      bulletPoints: [
        "Pitch deck review & improvement",
        "Fundraising strategy & planning",
        "Investor targeting & outreach strategy",
        "Financial model preparation for investors",
        "Grant and non-dilutive funding research"
      ]
    },
    disclaimer: "Digs & Gigs introduces you to advisors — we do not handle investment transactions.",
    legalDisclaimer: "Disclaimer: Digs & Gigs is a marketplace that connects users with independent professionals for advisory and consulting services. We do not act as a broker-dealer, do not sell or recommend securities, and do not participate in any securities transactions. Any investment or fundraising activity is solely between you and the advisor.",
    seo: {
      title: "Venture Capital & Startup Funding Advisors",
      metaDescription: "Connect with trusted startup fundraising advisors for pitch coaching, capital-raise strategy, and investor relations support. No brokerage or securities services.",
      keywords: "startup fundraising advisors, pitch coach, capital raise consulting, venture capital advisor, investor relations consulting, startup funding support"
    },
    diggerSignupSeo: {
      title: "Join as a Startup Funding Advisor",
      metaDescription: "Advisors — connect with startup founders seeking pitch coaching and fundraising strategy support. Advisory-only. No securities brokerage."
    },
    giggerPostingSeo: {
      title: "Find Startup Funding Advisors & Pitch Coaches",
      metaDescription: "Get expert help preparing for fundraising. Pitch review, investor readiness, and capital-raise advice. Digs & Gigs connects you with advisors — not brokers."
    }
  }
};

// Helper function to get content by industry slug
export const getIndustryContent = (slug: string | null): IndustryContentConfig | null => {
  if (!slug) return null;
  const normalizedSlug = slug.toLowerCase().trim();
  return industryContent[normalizedSlug] || null;
};

// Helper function to get content by industry name
export const getIndustryContentByName = (name: string | null): IndustryContentConfig | null => {
  if (!name) return null;
  // Convert name to slug format
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return getIndustryContent(slug);
};
