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
