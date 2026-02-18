/**
 * Shared logic for computing Digger profile completion score.
 * Used by RoleDashboard, ProfileDashboard, and DiggerInlineProfileEditor.
 */
export interface ProfileCompletionInput {
  handle?: string | null;
  business_name?: string | null;
  profession?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  work_photos?: string[] | null;
  skills?: string[] | null;
  keywords?: string[] | null;
  digger_skills?: { skills: { name: string } | null }[] | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  pricing_model?: string | null;
  certifications?: string[] | null;
  country?: string | null;
  service_countries?: string[] | null;
}

export interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  weight: number;
  essential: boolean;
}

export function computeProfileCompletion(profile: ProfileCompletionInput | null): {
  score: number;
  items: CompletionItem[];
  nextSteps: CompletionItem[];
  essentialsCompleted: number;
  totalEssentials: number;
} {
  if (!profile) {
    return { score: 0, items: [], nextSteps: [], essentialsCompleted: 0, totalEssentials: 0 };
  }

  const username = (profile.handle || profile.business_name || "").replace(/^@/, "").trim();
  const hasProfession =
    !!profile.profession?.trim() ||
    !!profile.business_name?.trim();
  const hasBio = !!(profile.bio && profile.bio.trim().length >= 80);
  const hasPhoto = !!profile.profile_image_url;
  const hasServiceArea =
    !!profile.country?.trim() ||
    (Array.isArray(profile.service_countries) && profile.service_countries.length > 0);
  const skillNames =
    (profile.digger_skills || [])
      ?.map((ds) => ds.skills?.name)
      .filter(Boolean) ||
    profile.skills ||
    profile.keywords ||
    [];
  const hasSkills = skillNames.length >= 3;
  const hasPricing = !!profile.pricing_model?.trim();
  const hasRates =
    profile.hourly_rate_min != null &&
    profile.hourly_rate_max != null;
  const hasWorkSamples = Array.isArray(profile.work_photos) && profile.work_photos.length > 0;
  const hasCertifications =
    Array.isArray(profile.certifications) && profile.certifications.length > 0;

  const items: CompletionItem[] = [
    { id: "username", label: "Choose your username", completed: username.length >= 3, weight: 10, essential: true },
    { id: "profession", label: "Select profession(s)", completed: hasProfession, weight: 15, essential: true },
    { id: "bio", label: "Write a clear bio (80+ chars)", completed: hasBio, weight: 20, essential: true },
    { id: "profile-photo", label: "Add profile photo", completed: hasPhoto, weight: 15, essential: true },
    { id: "service-area", label: "Set service area", completed: hasServiceArea, weight: 10, essential: true },
    { id: "skills", label: "Add at least 3 skills", completed: hasSkills, weight: 10, essential: false },
    { id: "pricing", label: "Select pricing model", completed: hasPricing, weight: 5, essential: false },
    { id: "rates", label: "Set hourly range", completed: hasRates, weight: 5, essential: false },
    { id: "work-samples", label: "Upload work sample(s)", completed: hasWorkSamples, weight: 5, essential: false },
    { id: "certifications", label: "Add certification(s)", completed: hasCertifications, weight: 5, essential: false },
  ];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const completedWeight = items.filter((i) => i.completed).reduce((s, i) => s + i.weight, 0);
  const score = Math.round((completedWeight / totalWeight) * 100);
  const essentials = items.filter((i) => i.essential);
  const essentialsCompleted = essentials.filter((i) => i.completed).length;
  const nextSteps = items.filter((i) => !i.completed).slice(0, 3);

  return {
    score,
    items,
    nextSteps,
    essentialsCompleted,
    totalEssentials: essentials.length,
  };
}

/** Input for profile-detail-page completion (real-time factors shown on Digger profile). */
export interface DiggerProfileDetailCompletionInput {
  profile_image_url?: string | null;
  profiles?: { avatar_url?: string | null } | null;
  hourly_rate?: number | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  pricing_model?: string | null;
  bio?: string | null;
  portfolio_url?: string | null;
  portfolio_urls?: string[] | null;
  certifications?: string[] | null;
  profession?: string | null;
  digger_categories?: { categories?: { name?: string } | null }[] | null;
  skills?: string[] | null;
  keywords?: string[] | null;
  digger_skills?: { skills: { name: string } | null }[] | null;
  website_url?: string | null;
  social_links?: unknown;
  /** Number of portfolio items (digger_portfolio_items). Pass from page state for real-time updates. */
  portfolio_item_count?: number;
  /** Number of experience entries (digger_experience). Pass from page state for real-time updates. */
  experience_count?: number;
}

/** 10 factors, 10% each. Used on Digger profile detail page; updates in real time when factors change. */
const PROFILE_DETAIL_WEIGHT = 10;

export function computeDiggerProfileDetailCompletion(input: DiggerProfileDetailCompletionInput | null): {
  score: number;
  items: CompletionItem[];
} {
  if (!input) {
    return { score: 0, items: [] };
  }

  const hasPhoto = !!(
    input.profile_image_url?.trim() ||
    (input.profiles?.avatar_url && String(input.profiles.avatar_url).trim())
  );
  const hasHourlyRate =
    (input.hourly_rate != null && Number(input.hourly_rate) > 0) ||
    (input.hourly_rate_min != null &&
      input.hourly_rate_max != null &&
      (Number(input.hourly_rate_min) > 0 || Number(input.hourly_rate_max) > 0));
  const hasAbout = !!(input.bio && input.bio.trim().length >= 80);
  const hasPortfolio =
    (input.portfolio_item_count ?? 0) > 0 ||
    !!(input.portfolio_url && input.portfolio_url.trim()) ||
    (Array.isArray(input.portfolio_urls) && input.portfolio_urls.length > 0);
  const hasCertifications =
    Array.isArray(input.certifications) && input.certifications.length > 0;
  const hasExperience = (input.experience_count ?? 0) > 0;
  const hasGithub = !!(
    input.social_links &&
    typeof input.social_links === "object" &&
    "github" in input.social_links &&
    String((input.social_links as Record<string, string>).github).trim()
  );
  const hasProfessions =
    (Array.isArray(input.digger_categories) && input.digger_categories.length > 0) ||
    !!(input.profession && input.profession.trim());
  const skillNames =
    (input.digger_skills || [])
      ?.map((ds) => ds.skills?.name)
      .filter(Boolean) ||
    input.skills ||
    input.keywords ||
    [];
  const hasSkills = skillNames.length >= 1;
  const hasWebsite = !!(input.website_url && String(input.website_url).trim());

  const items: CompletionItem[] = [
    { id: "profile-photo", label: "Profile photo", completed: hasPhoto, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "hourly-rate", label: "Hourly rate", completed: hasHourlyRate, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "about", label: "About", completed: hasAbout, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "portfolio", label: "Portfolio", completed: hasPortfolio, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "certifications", label: "Certifications", completed: hasCertifications, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "experience", label: "Experience", completed: hasExperience, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "github", label: "Connect GitHub", completed: hasGithub, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "professions", label: "Professions", completed: hasProfessions, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "skills", label: "Skills", completed: hasSkills, weight: PROFILE_DETAIL_WEIGHT, essential: false },
    { id: "website", label: "Website", completed: hasWebsite, weight: PROFILE_DETAIL_WEIGHT, essential: false },
  ];

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const completedWeight = items.filter((i) => i.completed).reduce((s, i) => s + i.weight, 0);
  const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return { score, items };
}
