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
      body: "Select Venture Capital & Startup Funding Support if you advise founders on raising capital – things like pitch decks, fundraising strategy, investor outreach, or grant funding.\n\nIf you are a licensed broker-dealer or regulated investment professional, please do not use Digs & Gigs to solicit or sell securities."
    },
    giggerPrompt: {
      heading: "Need help raising money for your startup?",
      body: "Post a project under Venture Capital & Startup Funding Support to get help with:",
      bulletPoints: [
        "Pitch deck review & improvement",
        "Fundraising strategy & planning",
        "Investor targeting & outreach strategy",
        "Financial model packaging for investors",
        "Grant and non-dilutive funding research"
      ]
    },
    disclaimer: "Digs & Gigs does not act as a broker-dealer or sell securities. We only connect users with advisors for consulting services.",
    legalDisclaimer: "Disclaimer: Digs & Gigs is a marketplace that connects users with independent professionals for advisory and consulting services. We do not act as a broker-dealer, do not sell or recommend securities, and do not participate in any securities transactions. Any investment or fundraising activity is solely between you and the advisor.",
    seo: {
      title: "Venture Capital & Startup Funding Support",
      metaDescription: "Connect with advisors who help founders prepare for fundraising. Get pitch coaching, investor strategy, financial modeling and grant funding guidance.",
      keywords: "venture capital advisor, startup funding consultant, pitch deck coach, fundraising strategy, investor relations, grant funding specialist, capital raise advisor"
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
