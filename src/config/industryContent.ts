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
}

// Map industry slugs to their content configurations
export const industryContent: Record<string, IndustryContentConfig> = {
  "venture-capital-startup-funding-support": {
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
    disclaimer: "Digs & Gigs introduces you to advisors — we do not handle investment transactions."
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
