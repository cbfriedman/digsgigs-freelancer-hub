import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2, CheckCircle2, AlertTriangle, Edit, Phone, Sparkles, FileText, Search, MapPin, ShieldCheck, CreditCard, Share2, User, FileCheck, Pencil, Upload, Trash2, ImagePlus, Plus, Code2 } from "lucide-react";
import { RatingsList } from "@/components/RatingsList";
import { RichSnippetPreview } from "@/components/RichSnippetPreview";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer"; 
import SEOHead from "@/components/SEOHead";
import { generateLocalBusinessSchema } from "@/components/StructuredData";
import { OptimizedImage } from "@/components/OptimizedImage";
import { DiggerPricingSelector } from "@/components/DiggerPricingSelector";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { ProfileClickPricingCard } from "@/components/ProfileClickPricingCard";
import { useProfileCallTracking } from "@/hooks/useProfileCallTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BioGenerator } from "@/components/BioGenerator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileHeader, ProfileAbout, ReferencesSection, CertificationsSection, CertificationEditorModal, ExperienceSection, ExperienceEditorModal, type DiggerCertification, type DiggerExperience } from "@/components/digger-profile";
import { getCanonicalDiggerProfilePath, normalizeHandle } from "@/lib/profileUrls";
import { DiggerInlineProfileEditor } from "@/components/DiggerInlineProfileEditor";
import { PortfolioEditor } from "@/components/portfolio/PortfolioEditor";
import { PortfolioDisplay } from "@/components/portfolio/PortfolioDisplay";
import type { DiggerPortfolioItem, DiggerPortfolioItemDraft } from "@/types/portfolio";
import { CountryFlagIcon } from "@/components/CountryFlagIcon";
import { getCodeForCountryName } from "@/config/regionOptions";
import { useProfessions } from "@/hooks/useProfessions";
import { useSkillsByCategory } from "@/hooks/useSkills";
import { LocationSelector, type LocationValue } from "@/components/LocationSelector";
import { resolveLocationFromText, useCountriesSearch } from "@/hooks/useLocations";
import { computeDiggerProfileDetailCompletion } from "@/lib/profileCompletion";
import { Progress } from "@/components/ui/progress";
import type { Digger, Reference, ReferenceRequest } from "./DiggerDetail/types";
import {
  isUuid,
  formatRealName,
  formatDisplayName,
  getDiggerProfileUrl,
  formatCurrency,
  formatEarningsCompact,
  getLocalTimeForCountry,
  formatJoinDate,
} from "./DiggerDetail/utils";

const GITHUB_CONNECT_STORAGE_KEY = "digsgigs_github_connect_digger_id";
const SOCIAL_CONNECT_STORAGE_KEY = "digsgigs_social_connect";

/** Supabase provider keys that support linkIdentity for social profiles */
const SOCIAL_OAUTH_PROVIDERS = ["linkedin", "facebook", "twitter"] as const;

function getSocialProfileUrlFromIdentity(
  provider: string,
  data: Record<string, unknown> | undefined
): string | null {
  if (!data || typeof data !== "object") return null;
  const link = [data.profile_url, data.url, data.link].find((v) => typeof v === "string" && v.startsWith("http"));
  if (link) return link as string;
  const username = (data.user_name ?? data.username ?? data.preferred_username) as string | undefined;
  if (username && typeof username === "string") {
    if (provider === "twitter") return `https://x.com/${username}`;
    if (provider === "facebook") return `https://www.facebook.com/${username}`;
    if (provider === "linkedin") return `https://www.linkedin.com/in/${username.replace(/\s+/g, "-").toLowerCase()}`;
  }
  return null;
}

const DiggerDetail = () => {
  const navigate = useNavigate();
  const { id: slug } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const viewAsClient = searchParams.get("as") === "client";
  const { userRoles } = useAuth();
  const [digger, setDigger] = useState<Digger | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [certifications, setCertifications] = useState<DiggerCertification[]>([]);
  const [certificationEditorOpen, setCertificationEditorOpen] = useState(false);
  const [certificationEditId, setCertificationEditId] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<DiggerExperience[]>([]);
  const [experienceEditorOpen, setExperienceEditorOpen] = useState(false);
  const [experienceEditId, setExperienceEditId] = useState<string | null>(null);
  const [referenceRequests, setReferenceRequests] = useState<Record<string, ReferenceRequest>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [hasViewAccess, setHasViewAccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null);
  const { isOnline } = useDiggerPresence(digger?.id ?? '');
  const { recordCall, isRecording: isCallingDigger } = useProfileCallTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  
  // People also viewed (related diggers)
  const [relatedDiggers, setRelatedDiggers] = useState<{ id: string; user_id: string; handle: string | null; business_name: string; profile_name: string | null; profession: string | null; profile_image_url: string | null; custom_occupation_title: string | null; profiles?: { full_name: string | null } | null; digger_categories?: { categories?: { name: string } }[] }[]>([]);
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [coverPhotoDialogOpen, setCoverPhotoDialogOpen] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const coverPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [profileHeaderEditOpen, setProfileHeaderEditOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [hourlyRateMinDraft, setHourlyRateMinDraft] = useState("");
  const [hourlyRateMaxDraft, setHourlyRateMaxDraft] = useState("");
  const hasHandledManageQueryRef = useRef(false);
  const [profileManagerOpen, setProfileManagerOpen] = useState(false);
  const [editorModal, setEditorModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    profileId: string | null;
  }>({
    open: false,
    mode: "edit",
    profileId: null,
  });
  const [ownerProfiles, setOwnerProfiles] = useState<
    { id: string; handle: string | null; profile_name: string | null; business_name: string; is_primary: boolean }[]
  >([]);
  const { professions, categoriesWithProfessions } = useProfessions();
  const { skillsByCategory, loading: skillsLoading } = useSkillsByCategory();
  const [sectionEditor, setSectionEditor] = useState<{
    open: boolean;
    section: "about" | "skills" | "profession" | "work" | "portfolio" | "availability" | "location" | "service_location" | "website" | "social" | "references" | "reviews" | null;
  }>({ open: false, section: null });
  const [aboutDraft, setAboutDraft] = useState("");
  const [availabilityDraft, setAvailabilityDraft] = useState<string>("");
  const emptyLocationValue: LocationValue = { countryId: null, regionId: null, cityId: null, countryName: "", regionName: "", cityName: "", countryCode: "" };
  const [locationEditValue, setLocationEditValue] = useState<LocationValue>(emptyLocationValue);
  const [serviceLocationDraft, setServiceLocationDraft] = useState<string[]>([]);
  const [serviceLocationSearchDraft, setServiceLocationSearchDraft] = useState("");
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [socialLinksDraft, setSocialLinksDraft] = useState<Record<string, string>>({});
  const [selectedProfessionsDraft, setSelectedProfessionsDraft] = useState<string[]>([]);
  const [additionalProfessionDraft, setAdditionalProfessionDraft] = useState("");
  const [additionalSkillDraft, setAdditionalSkillDraft] = useState("");
  const [selectedSkillsDraft, setSelectedSkillsDraft] = useState<string[]>([]);
  const [workPhotosDraft, setWorkPhotosDraft] = useState("");
  const [portfolioDraft, setPortfolioDraft] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<DiggerPortfolioItem[]>([]);
  const [isSectionSaving, setIsSectionSaving] = useState(false);
  const [refForm, setRefForm] = useState<{
    mode: "add" | "edit" | null;
    id?: string;
    reference_name: string;
    reference_email: string;
    reference_phone: string;
    project_description: string;
  }>({ mode: null, reference_name: "", reference_email: "", reference_phone: "", project_description: "" });
  const [refFormSaving, setRefFormSaving] = useState(false);
  const [verificationRequestLoading, setVerificationRequestLoading] = useState<string | null>(null);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubDraft, setGithubDraft] = useState("");
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubLinking, setGithubLinking] = useState(false);
  const [socialLinkingPlatform, setSocialLinkingPlatform] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [slug, userRoles]);

  // Admins can view all digger profiles without payment
  useEffect(() => {
    if (digger && Array.isArray(userRoles) && (userRoles.includes("admin") || userRoles.includes("gigger"))) {
      setHasViewAccess(true);
    }
  }, [digger, userRoles]);

  const loadOwnerProfiles = useCallback(async () => {
    if (!currentUser || !isOwnProfile) return;
    const { data } = await supabase
      .from("digger_profiles")
      .select("id, handle, profile_name, business_name, is_primary")
      .eq("user_id", currentUser.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setOwnerProfiles((data as { id: string; handle: string | null; profile_name: string | null; business_name: string; is_primary: boolean }[]) || []);
  }, [currentUser, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    void loadOwnerProfiles();
  }, [isOwnProfile, loadOwnerProfiles]);

  useEffect(() => {
    if (!isOwnProfile || hasHandledManageQueryRef.current) return;
    const manage = searchParams.get("manage") === "1";
    if (!manage) return;
    const mode = searchParams.get("mode");
    const profileIdParam = searchParams.get("profileId");
    setProfileManagerOpen(true);
    if (mode === "create") {
      // Single-profile model: opening create in manage mode edits the existing profile.
      setEditorModal({ open: true, mode: "edit", profileId: digger?.id || null });
    } else if (mode === "edit") {
      setEditorModal({ open: true, mode: "edit", profileId: profileIdParam || digger?.id || null });
    }
    hasHandledManageQueryRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("manage");
    next.delete("mode");
    next.delete("profileId");
    const query = next.toString();
    navigate(`${window.location.pathname}${query ? `?${query}` : ""}`, { replace: true });
  }, [digger?.id, isOwnProfile, navigate, searchParams]);

  // Fetch related diggers for "People also viewed" (one profile per user)
  useEffect(() => {
    if (!slug || !digger) return;
    const loadRelated = async () => {
      const { data } = await supabase
        .from("digger_profiles")
        .select("id, user_id, handle, business_name, profile_name, profession, profile_image_url, custom_occupation_title, profiles:profiles!digger_profiles_user_id_fkey(full_name), digger_categories(categories(name))")
        .neq("id", digger.id)
        .limit(24);
      if (!data?.length) return;
      const seen = new Set<string>();
      const unique = data.filter((d: { user_id: string }) => {
        if (d.user_id === digger.user_id) return false;
        if (seen.has(d.user_id)) return false;
        seen.add(d.user_id);
        return true;
      });
      setRelatedDiggers(unique.slice(0, 8));
    };
    loadRelated();
  }, [slug, digger]);

  const loadData = async () => {
    if (!slug) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);
    const viewerIsAdmin = Array.isArray(userRoles) && userRoles.includes("admin");
    const viewerIsGigger = Array.isArray(userRoles) && userRoles.includes("gigger");

    // Fetch digger by UUID or username (handle) — anyone with the profile link can view
    const fetchQuery = isUuid(slug)
      ? supabase.from("digger_profiles").select(`*, profiles!digger_profiles_user_id_fkey (full_name, email, avatar_url, country, timezone, email_verified, phone_verified, payment_verified, id_verified, handle), digger_categories (categories (name, description)), digger_skills (skills (name))`).eq("id", slug)
      : supabase.from("digger_profiles").select(`*, profiles!digger_profiles_user_id_fkey (full_name, email, avatar_url, country, timezone, email_verified, phone_verified, payment_verified, id_verified, handle), digger_categories (categories (name, description)), digger_skills (skills (name))`).eq("handle", slug.toLowerCase());
    const { data: diggerData, error: diggerError } = await fetchQuery.single();

    if (diggerError || !diggerData) {
      toast.error("Digger not found");
      navigate("/");
      return;
    }

    const profileId = diggerData.id;
    setDigger(diggerData as unknown as Digger);
    // Load total earnings for this digger (completed transactions only)
    try {
      const { data: earningsRows } = await supabase
        .from("transactions")
        .select("digger_payout, status, completed_at")
        .eq("digger_id", diggerData.id);
      const sum = (earningsRows || []).reduce((acc, row) => {
        const isCompleted = row.completed_at != null || row.status === "completed";
        return isCompleted ? acc + (row.digger_payout || 0) : acc;
      }, 0);
      setTotalEarnings(sum);
    } catch {
      setTotalEarnings(null);
    }
    setIsOwnProfile(session?.user?.id === diggerData.user_id);

    // Replace URL with canonical handle-based hybrid profile URL.
    if (diggerData.handle) {
      const cleanUrl =
        getCanonicalDiggerProfilePath({ handle: normalizeHandle(diggerData.handle), diggerId: diggerData.id }) ||
        window.location.pathname;
      if (window.location.pathname !== cleanUrl) {
        window.history.replaceState(null, '', cleanUrl);
      }
    }

    // Record profile click when a non-owner views (for analytics)
    if (session?.user?.id !== diggerData.user_id) {
      try {
        await supabase.functions.invoke('record-profile-click', {
          body: { digger_profile_id: profileId }
        });
      } catch (error) {
        logger.error('Failed to record click:', error);
      }
    }

    // Check if user has already paid to view this profile
    if (session?.user) {
      try {
        const { data: profileView, error: profileViewError } = await supabase
          .from("profile_views")
          .select("*")
          .eq("consumer_id", session.user.id)
          .eq("digger_id", profileId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle cases where no record exists
        
        if (profileViewError && profileViewError.code !== 'PGRST116') {
          logger.error('Error checking profile view access:', profileViewError);
        }
        setHasViewAccess(!!profileView || viewerIsAdmin || viewerIsGigger);
      } catch (error) {
        // Silently fail - view access check shouldn't block page load
        logger.error('Failed to check profile view access:', error);
        setHasViewAccess(viewerIsAdmin || viewerIsGigger);
      }
    } else if (viewerIsAdmin || viewerIsGigger) {
      setHasViewAccess(true);
    }

    const isProfileOwner = session?.user?.id === diggerData.user_id;
    const { data: referencesData } = await (supabase as any)
      .from(isProfileOwner || viewerIsAdmin || viewerIsGigger ? "references" : "references_public")
      .select("*")
      .eq("digger_id", profileId);

    setReferences((referencesData || []) as Reference[]);

    const { data: certsData } = await (supabase
      .from("digger_certifications" as any))
      .select("*")
      .eq("digger_profile_id", profileId)
      .order("sort_order", { ascending: true });
    setCertifications((certsData || []) as unknown as DiggerCertification[]);

    const { data: expData } = await (supabase
      .from("digger_experience" as any))
      .select("*")
      .eq("digger_profile_id", profileId)
      .order("sort_order", { ascending: true });
    setExperiences((expData || []) as unknown as DiggerExperience[]);

    const { data: portfolioData } = await (supabase
      .from("digger_portfolio_items" as any))
      .select("*")
      .eq("digger_profile_id", profileId)
      .order("sort_order", { ascending: true });
    setPortfolioItems((portfolioData as unknown as DiggerPortfolioItem[]) || []);

    setLoading(false);

    // Track ViewContent event for Facebook Pixel
    if (fbConfigured && diggerData) {
      trackFBEvent('ViewContent', {
        content_name: diggerData.business_name || diggerData.profession,
        content_ids: [diggerData.id],
        content_type: 'digger_profile',
        value: diggerData.hourly_rate || diggerData.hourly_rate_min || 0,
        currency: 'USD',
      });
    }

    // Load reference contact requests if user is logged in
    if (session?.user) {
      const { data: requestsData } = await supabase
        .from("reference_contact_requests")
        .select("id, reference_id, status")
        .eq("consumer_id", session.user.id);
      
      if (requestsData) {
        const requestsMap: Record<string, ReferenceRequest> = {};
        requestsData.forEach((req: { reference_id: string; id: string; status: string }) => {
          requestsMap[req.reference_id] = { id: req.id, status: req.status };
        });
        setReferenceRequests(requestsMap);
      }
    }

  };

  useEffect(() => {
    if (!currentUser || !digger || !isOwnProfile) return;
    const pendingId = sessionStorage.getItem(GITHUB_CONNECT_STORAGE_KEY);
    if (pendingId !== digger.id) return;
    sessionStorage.removeItem(GITHUB_CONNECT_STORAGE_KEY);
    (async () => {
      try {
        const { data: identitiesData } = await supabase.auth.getUserIdentities();
        const identities = Array.isArray(identitiesData) ? identitiesData : (identitiesData as { identities?: { provider: string; identity_data?: Record<string, unknown> }[] } | null)?.identities ?? [];
        const gh = identities.find((i: { provider: string }) => i.provider === "github");
        const identityData = (gh as { identity_data?: { user_name?: string; login?: string } } | undefined)?.identity_data;
        const username = identityData?.user_name ?? identityData?.login;
        const profileUrl = username ? `https://github.com/${username}` : null;
        if (!profileUrl) {
          toast.error("GitHub account not found. Try connecting again.");
          return;
        }
        const current = (digger.social_links && typeof digger.social_links === "object" ? { ...(digger.social_links as Record<string, string>) } : {}) as Record<string, string>;
        current.github = profileUrl;
        const nextLinks = Object.fromEntries(Object.entries(current).filter(([, v]) => Boolean(String(v).trim())));
        await (supabase.from("digger_profiles") as any).update({ social_links: nextLinks }).eq("id", digger.id);
        await loadData();
        setGithubModalOpen(false);
        toast.success("GitHub profile connected.");
      } catch (e) {
        logger.error("GitHub connect callback error:", e);
        toast.error("Failed to connect GitHub. Try again.");
      }
    })();
  // loadData is intentionally omitted from deps (stable enough; avoids re-running every render)
  }, [currentUser?.id, digger?.id, isOwnProfile]);

  useEffect(() => {
    if (!currentUser || !digger || !isOwnProfile) return;
    const raw = sessionStorage.getItem(SOCIAL_CONNECT_STORAGE_KEY);
    if (!raw) return;
    let payload: { diggerId: string; platform: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(SOCIAL_CONNECT_STORAGE_KEY);
      return;
    }
    if (payload.diggerId !== digger.id || !SOCIAL_OAUTH_PROVIDERS.includes(payload.platform as typeof SOCIAL_OAUTH_PROVIDERS[number])) {
      if (payload.diggerId === digger.id) sessionStorage.removeItem(SOCIAL_CONNECT_STORAGE_KEY);
      return;
    }
    sessionStorage.removeItem(SOCIAL_CONNECT_STORAGE_KEY);
    const platform = payload.platform;
    (async () => {
      try {
        const { data: identitiesData } = await supabase.auth.getUserIdentities();
        const identities = Array.isArray(identitiesData) ? identitiesData : (identitiesData as { identities?: { provider: string; identity_data?: Record<string, unknown> }[] } | null)?.identities ?? [];
        const identity = identities.find((i: { provider: string }) => i.provider === platform);
        const identityData = (identity as { identity_data?: Record<string, unknown> } | undefined)?.identity_data;
        const profileUrl = getSocialProfileUrlFromIdentity(platform, identityData);
        if (!profileUrl) {
          toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} profile not found. Try connecting again or add the link manually.`);
          return;
        }
        const current = (digger.social_links && typeof digger.social_links === "object" ? { ...(digger.social_links as Record<string, string>) } : {}) as Record<string, string>;
        current[platform] = profileUrl;
        const nextLinks = Object.fromEntries(Object.entries(current).filter(([, v]) => Boolean(String(v).trim())));
        await (supabase.from("digger_profiles") as any).update({ social_links: nextLinks }).eq("id", digger.id);
        await loadData();
        setSectionEditor({ open: false, section: null });
        const label = platform === "twitter" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1);
        toast.success(`${label} connected.`);
      } catch (e) {
        logger.error("Social connect callback error:", e);
        toast.error("Failed to connect. Try adding the link manually.");
      }
    })();
  }, [currentUser?.id, digger?.id, isOwnProfile]);

  const handleShare = () => {
    const url = `${window.location.origin}${getDiggerProfileUrl(digger!)}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Profile link copied to clipboard")).catch(() => toast.error("Could not copy link"));
  };

  const openEditModal = (profileId?: string) => {
    setEditorModal({
      open: true,
      mode: "edit",
      profileId: profileId || digger?.id || null,
    });
  };

  const openProfileHeaderEditModal = () => {
    if (!digger) return;
    setProfileNameDraft(digger.profile_name || "Main Profile");
    setHourlyRateMinDraft(digger.hourly_rate_min != null ? String(digger.hourly_rate_min) : digger.hourly_rate != null ? String(digger.hourly_rate) : "");
    setHourlyRateMaxDraft(digger.hourly_rate_max != null ? String(digger.hourly_rate_max) : "");
    setProfileHeaderEditOpen(true);
  };

  const saveProfileHeaderEdit = async () => {
    if (!digger) return;
    try {
      const minVal = hourlyRateMinDraft.trim() ? parseFloat(hourlyRateMinDraft) : null;
      const maxVal = hourlyRateMaxDraft.trim() ? parseFloat(hourlyRateMaxDraft) : null;
      const hourlyMin = minVal != null && !isNaN(minVal) ? minVal : null;
      const hourlyMax = maxVal != null && !isNaN(maxVal) ? maxVal : null;
      const hourlyRate = hourlyMin ?? hourlyMax;
      const updates: Record<string, unknown> = {
        profile_name: profileNameDraft.trim() || null,
        hourly_rate_min: hourlyMin,
        hourly_rate_max: hourlyMax,
        hourly_rate: hourlyRate,
      };
      const { error } = await supabase.from("digger_profiles").update(updates).eq("id", digger.id);
      if (error) throw error;
      setDigger((d) =>
        d
          ? {
              ...d,
              profile_name: profileNameDraft.trim() || null,
              hourly_rate_min: hourlyMin,
              hourly_rate_max: hourlyMax,
              hourly_rate: hourlyRate,
            }
          : null
      );
      setProfileHeaderEditOpen(false);
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const openSectionModal = (section: "about" | "skills" | "profession" | "work" | "portfolio" | "availability" | "location" | "service_location" | "website" | "social" | "references" | "reviews") => {
    if (!digger) return;
    if (section === "about") setAboutDraft(digger.bio || "");
    if (section === "availability") setAvailabilityDraft(digger.availability || "");
    if (section === "location") {
      setLocationEditValue({
        ...emptyLocationValue,
        countryName: (digger.country ?? "").trim(),
        regionName: (digger.state ?? "").split(",")[0]?.trim() || "",
        cityName: (digger.city ?? "").trim(),
      });
    }
    if (section === "service_location") {
      setServiceLocationDraft((digger.service_countries?.length ?? 0) > 0 ? digger.service_countries! : (digger.country ? [digger.country] : []));
      setServiceLocationSearchDraft("");
    }
    if (section === "website") setWebsiteDraft(digger.website_url || "");
    if (section === "social") setSocialLinksDraft((digger.social_links || {}) as Record<string, string>);
    if (section === "profession") {
      const fromText = (digger.profession || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const fromLegacy = (digger.digger_categories || [])
        .map((dc) => dc.categories?.name || "")
        .map((s) => s.trim())
        .filter(Boolean);
      const normalized = Array.from(new Set([...(fromText.length ? fromText : fromLegacy)]));
      setSelectedProfessionsDraft(normalized);
      setAdditionalProfessionDraft("");
    }
    if (section === "skills") {
      setSelectedSkillsDraft(getDiggerSkillNames(digger));
      setAdditionalSkillDraft("");
    }
    if (section === "work") setWorkPhotosDraft((digger.work_photos || []).join("\n"));
    if (section === "portfolio") setPortfolioDraft(digger.portfolio_url || "");
    if (section === "references") setRefForm({ mode: null, reference_name: "", reference_email: "", reference_phone: "", project_description: "" });
    setSectionEditor({ open: true, section });
  };

  useEffect(() => {
    if (sectionEditor.section !== "location" || !sectionEditor.open || !digger) return;
    let cancelled = false;
    resolveLocationFromText(digger.country ?? null, digger.state ?? null, digger.city ?? null).then((resolved) => {
      if (!cancelled) setLocationEditValue(resolved);
    });
    return () => { cancelled = true; };
  }, [sectionEditor.section, sectionEditor.open, digger?.id, digger?.country, digger?.state, digger?.city]);

  const serviceLocationCountries = useCountriesSearch(serviceLocationSearchDraft);
  const serviceLocationCountryList = serviceLocationCountries.data ?? [];

  const scrollToProfileSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCompletionFactorClick = (itemId: string) => {
    switch (itemId) {
      case "profile-photo":
        scrollToProfileSection("profile-header-section");
        break;
      case "hourly-rate":
        // No dedicated section; rate is edited via header modal
        openProfileHeaderEditModal();
        break;
      case "about":
        scrollToProfileSection("about-section");
        break;
      case "portfolio":
        scrollToProfileSection("portfolio-section");
        break;
      case "certifications":
        scrollToProfileSection("certifications-section");
        break;
      case "experience":
        scrollToProfileSection("experience-section");
        break;
      case "github":
        // No section; GitHub is in sidebar, edit via modal
        setGithubModalOpen(true);
        break;
      case "professions":
        openSectionModal("profession");
        break;
      case "skills":
        openSectionModal("skills");
        break;
      case "website":
        openSectionModal("website");
        break;
      default:
        break;
    }
  };

  const getAvailabilityLabel = (value: string | null) => {
    if (!value) return "Not specified";
    const labels: Record<string, string> = {
      immediate: "Immediate",
      this_week: "This week",
      this_month: "This month",
      not_available: "Not available for new work",
    };
    return labels[value] || value;
  };

  const removeBlockedSkills = (skills: string[]): string[] =>
    skills.filter((skill) => skill.trim().toLowerCase() !== "reactsf");

  /** Skill names from junction table + custom skills (legacy skills/keywords) */
  const getDiggerSkillNames = useCallback((d: Digger | null): string[] => {
    if (!d) return [];
    const fromJunction = (d.digger_skills || [])
      .map((ds) => ds.skills?.name)
      .filter((n): n is string => Boolean(n));
    const fromLegacy = removeBlockedSkills(d.skills || d.keywords || []);
    return removeBlockedSkills(Array.from(new Set([...fromJunction, ...fromLegacy])));
  }, []);

  const dbSkillNameSet = useMemo(
    () => new Set(Object.values(skillsByCategory).flat().map((s) => s.name)),
    [skillsByCategory]
  );

  const dbProfessionGroups = useMemo(
    () =>
      (categoriesWithProfessions || [])
        .map((group) => ({
          category: group.name,
          items: (group.professions || []).map((p) => p.name).filter(Boolean),
        }))
        .filter((group) => group.items.length > 0),
    [categoriesWithProfessions]
  );

  const dbProfessionNameSet = useMemo(
    () => new Set(dbProfessionGroups.flatMap((group) => group.items)),
    [dbProfessionGroups]
  );

  const profileDetailCompletion = useMemo(() => {
    if (!digger) return { score: 0, items: [] };
    return computeDiggerProfileDetailCompletion({
      profile_image_url: digger.profile_image_url,
      profiles: digger.profiles,
      hourly_rate: digger.hourly_rate,
      hourly_rate_min: digger.hourly_rate_min,
      hourly_rate_max: digger.hourly_rate_max,
      pricing_model: digger.pricing_model,
      bio: digger.bio,
      portfolio_url: digger.portfolio_url,
      portfolio_urls: digger.portfolio_urls,
      certifications: digger.certifications,
      profession: digger.profession,
      digger_categories: digger.digger_categories,
      skills: digger.skills,
      keywords: digger.keywords,
      digger_skills: digger.digger_skills,
      website_url: digger.website_url,
      social_links: digger.social_links,
      portfolio_item_count: portfolioItems.length,
      experience_count: experiences.length,
    });
  }, [digger, portfolioItems.length, experiences.length]);

  const getDisplayedProfessions = (): string[] => {
    const fromText = (digger?.profession || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const dedupedText = Array.from(new Set(fromText));
    if (dedupedText.length > 0) return dedupedText;
    const fromLegacy = (digger?.digger_categories || [])
      .map((dc) => dc.categories?.name || "")
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(fromLegacy));
  };

  const getBaseLocationDisplay = (): string => {
    const combined = [digger?.city, digger?.state, digger?.country].filter(Boolean).join(", ");
    return combined || getServiceLocationDisplay() || "";
  };

  const socialPlatforms: { key: string; label: string; placeholder: string; domain: string }[] = [
    { key: "github", label: "GitHub", placeholder: "https://github.com/your-username", domain: "github.com" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/your-name", domain: "linkedin.com" },
    { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/your-handle", domain: "x.com" },
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/your-handle", domain: "instagram.com" },
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-page", domain: "facebook.com" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@your-channel", domain: "youtube.com" },
    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@your-handle", domain: "tiktok.com" },
  ];

  /** Favicon URL for a given link (for social platform icon on the right) */
  const getSocialFaviconUrl = (href: string): string => {
    try {
      const host = new URL(href).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=48`;
    } catch {
      return "";
    }
  };

  const githubUrl = (digger?.social_links && typeof digger.social_links === "object" && "github" in digger.social_links)
    ? String((digger.social_links as Record<string, string>).github).trim()
    : "";

  /** Extract username from GitHub profile URL for avatar (e.g. https://github.com/foo -> foo) */
  const githubUsername = (() => {
    if (!githubUrl) return "";
    try {
      const u = new URL(githubUrl);
      const path = u.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
      return path || "";
    } catch {
      return "";
    }
  })();
  const githubAvatarUrl = githubUsername ? `https://github.com/${githubUsername}.png` : "";

  const openGithubModal = () => {
    setGithubDraft(githubUrl);
    setGithubModalOpen(true);
  };

  const handleConnectWithGitHub = async () => {
    if (!digger) return;
    setGithubLinking(true);
    try {
      sessionStorage.setItem(GITHUB_CONNECT_STORAGE_KEY, digger.id);
      const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search || ""}`;
      const { error } = await supabase.auth.linkIdentity({
        provider: "github",
        options: { redirectTo },
      });
      if (error) {
        sessionStorage.removeItem(GITHUB_CONNECT_STORAGE_KEY);
        const msg = error.message || "";
        if (msg.toLowerCase().includes("manual linking") && msg.toLowerCase().includes("disabled")) {
          toast("Use the option below to add your GitHub profile link manually.", {
            description: "GitHub sign-in linking is not enabled for this site. Paste your profile URL and click Save link.",
          });
        } else {
          toast.error(msg || "Could not start GitHub authorization.");
        }
      }
    } catch (e) {
      sessionStorage.removeItem(GITHUB_CONNECT_STORAGE_KEY);
      logger.error("GitHub linkIdentity error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("manual linking") && msg.toLowerCase().includes("disabled")) {
        toast("Use the option below to add your GitHub profile link manually.", {
          description: "GitHub sign-in linking is not enabled for this site. Paste your profile URL and click Save link.",
        });
      } else {
        toast.error("GitHub sign-in is not configured or failed. You can add your profile link manually below.");
      }
    } finally {
      setGithubLinking(false);
    }
  };

  const handleSaveGithub = async () => {
    if (!digger) return;
    setGithubSaving(true);
    try {
      const trimmed = githubDraft.trim();
      const current = (digger.social_links && typeof digger.social_links === "object" ? { ...(digger.social_links as Record<string, string>) } : {}) as Record<string, string>;
      if (trimmed) {
        current.github = trimmed;
      } else {
        delete current.github;
      }
      const nextLinks = Object.fromEntries(Object.entries(current).filter(([, v]) => Boolean(String(v).trim())));
      await (supabase.from("digger_profiles") as any).update({ social_links: Object.keys(nextLinks).length ? nextLinks : null }).eq("id", digger.id);
      await loadData();
      setGithubModalOpen(false);
      toast.success(trimmed ? "GitHub profile connected." : "GitHub link removed.");
    } catch {
      toast.error("Failed to update GitHub link.");
    } finally {
      setGithubSaving(false);
    }
  };

  const handleConnectWithSocial = async (platform: string) => {
    if (!digger || !SOCIAL_OAUTH_PROVIDERS.includes(platform as typeof SOCIAL_OAUTH_PROVIDERS[number])) return;
    setSocialLinkingPlatform(platform);
    try {
      sessionStorage.setItem(SOCIAL_CONNECT_STORAGE_KEY, JSON.stringify({ diggerId: digger.id, platform }));
      const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search || ""}`;
      const { error } = await (supabase.auth as any).linkIdentity({
        provider: platform,
        options: { redirectTo },
      } as any);
      if (error) {
        sessionStorage.removeItem(SOCIAL_CONNECT_STORAGE_KEY);
        const msg = error.message || "";
        if (msg.toLowerCase().includes("manual linking") && msg.toLowerCase().includes("disabled")) {
          toast("Add your profile link manually in the field below.", {
            description: "Sign-in linking is not enabled for this site.",
          });
        } else {
          toast.error(msg || "Could not start authorization.");
        }
      }
    } catch (e) {
      sessionStorage.removeItem(SOCIAL_CONNECT_STORAGE_KEY);
      logger.error("Social linkIdentity error:", e);
      toast.error("Sign-in is not configured or failed. Use the URL field below.");
    } finally {
      setSocialLinkingPlatform(null);
    }
  };

  const sanitizeSocialLinks = (links: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(links || {})) {
      const trimmed = (value || "").trim();
      if (trimmed) out[key] = trimmed;
    }
    return out;
  };

  const parseLineList = (value: string): string[] =>
    value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSaveSection = async () => {
    if (!digger || !sectionEditor.section) return;
    setIsSectionSaving(true);
    try {
      if (sectionEditor.section === "about") {
        await supabase.from("digger_profiles").update({ bio: aboutDraft || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "skills") {
        const nextNames = Array.from(new Set(removeBlockedSkills(selectedSkillsDraft.map((s) => s.trim()).filter(Boolean))));
        const dbNames = nextNames.filter((n) => dbSkillNameSet.has(n));
        const customNames = nextNames.filter((n) => !dbSkillNameSet.has(n));
        const { data: skillRows } = await (supabase.from("skills" as any)).select("id").in("name", dbNames);
        const skillIds = (skillRows || []).map((r: any) => r.id);
        await (supabase.from("digger_skills" as any)).delete().eq("digger_profile_id", digger.id);
        if (skillIds.length > 0) {
          await (supabase.from("digger_skills" as any)).insert(
            skillIds.map((skill_id: string) => ({ digger_profile_id: digger.id, skill_id }))
          );
        }
        await supabase
          .from("digger_profiles")
          .update({ skills: customNames.length ? customNames : null, keywords: customNames.length ? customNames : null })
          .eq("id", digger.id);
        setDigger((d) =>
          d
            ? {
                ...d,
                digger_skills: dbNames.map((name) => ({ skills: { name } })),
                skills: customNames.length ? customNames : null,
                keywords: customNames.length ? customNames : null,
              }
            : null
        );
      } else if (sectionEditor.section === "profession") {
        const nextProfessions = Array.from(
          new Set(
            selectedProfessionsDraft
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
        await supabase
          .from("digger_profiles")
          .update({ profession: nextProfessions.length ? nextProfessions.join(", ") : null })
          .eq("id", digger.id);

        // Keep structured profession assignments in sync for DB-driven experiences.
        const selectedDbNames = nextProfessions.filter((name) => dbProfessionNameSet.has(name));
        const { data: selectedProfessionRows } = await supabase
          .from("professions")
          .select("id, name")
          .in("name", selectedDbNames);

        await supabase
          .from("digger_profession_assignments")
          .delete()
          .eq("digger_profile_id", digger.id);

        if ((selectedProfessionRows || []).length > 0) {
          const rows = (selectedProfessionRows || []).map((row, index) => ({
            digger_profile_id: digger.id,
            profession_id: row.id,
            is_primary: index === 0,
          }));
          await supabase.from("digger_profession_assignments").insert(rows);
        }
      } else if (sectionEditor.section === "work") {
        const nextPhotos = parseLineList(workPhotosDraft);
        await supabase.from("digger_profiles").update({ work_photos: nextPhotos.length ? nextPhotos : null }).eq("id", digger.id);
      } else if (sectionEditor.section === "portfolio") {
        await supabase.from("digger_profiles").update({ portfolio_url: portfolioDraft.trim() || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "availability") {
        const val = availabilityDraft.trim() || null;
        await supabase.from("digger_profiles").update({ availability: val }).eq("id", digger.id);
      } else if (sectionEditor.section === "location") {
        const countryVal = locationEditValue.countryName?.trim() || null;
        const stateVal = locationEditValue.regionName?.trim() || null;
        const cityVal = locationEditValue.cityName?.trim() || null;
        const locationText = [cityVal, stateVal, countryVal].filter(Boolean).join(", ") || "Not specified";
        // Keep base location shared across all profiles for this digger user.
        await supabase
          .from("digger_profiles")
          .update({ country: countryVal, city: cityVal, state: stateVal, location: locationText } as any)
          .eq("user_id", digger.user_id);
        // Also sync shared identity location used by Gigger + header.
        await (supabase
          .from("profiles") as any)
          .update({ country: countryVal, city: cityVal, state: stateVal })
          .eq("id", digger.user_id);
      } else if (sectionEditor.section === "service_location") {
        await (supabase.from("digger_profiles") as any).update({ service_countries: serviceLocationDraft.length ? serviceLocationDraft : null }).eq("id", digger.id);
      } else if (sectionEditor.section === "website") {
        await (supabase.from("digger_profiles") as any).update({ website_url: websiteDraft.trim() || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "social") {
        const nextLinks = sanitizeSocialLinks(socialLinksDraft);
        await (supabase.from("digger_profiles") as any).update({ social_links: Object.keys(nextLinks).length ? nextLinks : null }).eq("id", digger.id);
      }

      if (["about", "skills", "profession", "work", "portfolio", "availability", "location", "service_location", "website", "social"].includes(sectionEditor.section)) {
        toast.success("Section updated");
        await loadData();
      }
      setSectionEditor({ open: false, section: null });
    } catch {
      toast.error("Failed to update section");
    } finally {
      setIsSectionSaving(false);
    }
  };

  const handleSavePortfolio = async (drafts: DiggerPortfolioItemDraft[]) => {
    if (!digger) return;
    const savedIds: string[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const payload = {
        title: d.title,
        description: d.description || null,
        project_url: d.project_url || null,
        skills: d.skills || [],
        category: d.category || null,
        media: d.media || [],
        sort_order: i,
      };
      if (d.id && !String(d.id).startsWith("draft-")) {
        const { error } = await (supabase.from("digger_portfolio_items" as any)).update(payload).eq("id", d.id).eq("digger_profile_id", digger.id);
        if (error) throw error;
        savedIds.push(d.id);
      } else {
        const { data, error } = await (supabase
          .from("digger_portfolio_items" as any))
          .insert({ digger_profile_id: digger.id, ...payload })
          .select("id")
          .single();
        if (error) throw error;
        if ((data as any)?.id) savedIds.push((data as any).id);
      }
    }
    const { data: existing } = await (supabase.from("digger_portfolio_items" as any)).select("id").eq("digger_profile_id", digger.id);
    const toDelete = (existing || []).filter((r: any) => !savedIds.includes(r.id)).map((r: any) => r.id);
    if (toDelete.length > 0) {
      await (supabase.from("digger_portfolio_items" as any)).delete().in("id", toDelete);
    }
    const { data: updated } = await (supabase
      .from("digger_portfolio_items" as any))
      .select("*")
      .eq("digger_profile_id", digger.id)
      .order("sort_order", { ascending: true });
    setPortfolioItems((updated as unknown as DiggerPortfolioItem[]) || []);
    setSectionEditor({ open: false, section: null });
    toast.success("Portfolio saved");
    await loadData();
  };

  const refetchReferences = useCallback(async () => {
    if (!digger) return;
    const { data } = await supabase.from("references").select("*").eq("digger_id", digger.id);
    setReferences(data || []);
  }, [digger?.id]);

  const saveReference = async () => {
    if (!digger || refForm.mode === null) return;
    const name = refForm.reference_name.trim();
    const email = refForm.reference_email.trim();
    if (!name || !email) {
      toast.error("Name and email are required.");
      return;
    }
    setRefFormSaving(true);
    try {
      const payload = {
        reference_name: name,
        reference_email: email,
        reference_phone: refForm.reference_phone.trim() || null,
        project_description: refForm.project_description.trim() || null,
      };
      if (refForm.mode === "edit" && refForm.id) {
        const { error } = await supabase.from("references").update(payload).eq("id", refForm.id).eq("digger_id", digger.id);
        if (error) throw error;
        toast.success("Reference updated.");
      } else {
        const { error } = await supabase.from("references").insert({ digger_id: digger.id, ...payload });
        if (error) throw error;
        toast.success("Reference added.");
      }
      await refetchReferences();
      setRefForm({ mode: null, reference_name: "", reference_email: "", reference_phone: "", project_description: "" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save reference.");
    } finally {
      setRefFormSaving(false);
    }
  };

  const deleteReference = async (id: string) => {
    if (!digger || !window.confirm("Remove this reference?")) return;
    try {
      const { error } = await supabase.from("references").delete().eq("id", id).eq("digger_id", digger.id);
      if (error) throw error;
      toast.success("Reference removed.");
      await refetchReferences();
      if (refForm.mode === "edit" && refForm.id === id) {
        setRefForm({ mode: null, reference_name: "", reference_email: "", reference_phone: "", project_description: "" });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove reference.");
    }
  };

  const sendVerificationRequest = async (referenceId: string) => {
    if (!digger) return;
    setVerificationRequestLoading(referenceId);
    try {
      await invokeEdgeFunction<{ success?: boolean }>(supabase, "send-reference-verification", {
        body: { reference_id: referenceId },
      });
      toast.success("Verification email sent. Ask your reference to check their inbox.");
      await refetchReferences();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send verification email.");
    } finally {
      setVerificationRequestLoading(null);
    }
  };

  const handleProfilePhotoReplace = () => {
    profilePhotoInputRef.current?.click();
  };

  const syncProfilePhotoEverywhere = async (url: string | null) => {
    if (!digger) return;
    const userId = digger.user_id;
    const photo = url || null;
    const authValue = url || "";
    const { error: diggerErr } = await supabase.from("digger_profiles").update({ profile_image_url: photo }).eq("user_id", userId);
    if (diggerErr) throw diggerErr;
    const { error: profileErr } = await supabase.from("profiles").update({ avatar_url: photo }).eq("id", userId);
    if (profileErr) logger.warn("Failed to sync profiles.avatar_url:", profileErr);
    if (currentUser?.id === userId) {
      try {
        const existingMetadata = currentUser.user_metadata || {};
        await supabase.auth.updateUser({ data: { ...existingMetadata, avatar_url: authValue, picture: authValue } });
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.user) setCurrentUser(session.user);
      } catch (e) {
        logger.warn("Failed to sync auth user_metadata:", e);
      }
    }
  };

  const handleProfilePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!digger || !e.target.files?.length) return;
    try {
      setProfilePhotoUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      await syncProfilePhotoEverywhere(publicUrl);
      setDigger((d) => (d ? { ...d, profile_image_url: publicUrl, profiles: { ...d.profiles, avatar_url: publicUrl } } : null));
      setProfilePhotoDialogOpen(false);
      toast.success("Profile photo updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setProfilePhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleProfilePhotoRemove = async () => {
    if (!digger) return;
    try {
      await syncProfilePhotoEverywhere(null);
      setDigger((d) => (d ? { ...d, profile_image_url: null, profiles: { ...d.profiles, avatar_url: null } } : null));
      setProfilePhotoDialogOpen(false);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleCoverPhotoReplace = () => {
    coverPhotoInputRef.current?.click();
  };

  const handleCoverPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!digger || !e.target.files?.length) return;
    try {
      setCoverPhotoUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `cover-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: publicUrl } as Record<string, unknown>).eq("id", digger.id);
      if (error) throw error;
      setDigger((d) => (d ? { ...d, cover_photo_url: publicUrl } : null));
      setCoverPhotoDialogOpen(false);
      toast.success("Cover photo updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload cover photo");
    } finally {
      setCoverPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverPhotoRemove = async () => {
    if (!digger) return;
    try {
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: null } as Record<string, unknown>).eq("id", digger.id);
      if (error) throw error;
      setDigger((d) => (d ? { ...d, cover_photo_url: null } : null));
      setCoverPhotoDialogOpen(false);
      toast.success("Cover photo removed");
    } catch {
      toast.error("Failed to remove cover photo");
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error("Please sign in to send messages");
      navigate("/register");
      return;
    }

    if (!digger) return;

    try {
      // Check if conversation already exists with this digger
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("digger_id", digger.id)
        .eq("consumer_id", currentUser.id)
        .maybeSingle();

      if (existingConv && existingConv.id) {
        navigate(`/messages?conversation=${existingConv.id}`);
        return;
      }

      // Create new conversation without a specific gig
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          digger_id: digger.id,
          consumer_id: currentUser.id,
          gig_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      if (newConv && newConv.id) {
        toast.success("Conversation started!");
        navigate(`/messages?conversation=${newConv.id}`);
      } else {
        throw new Error("Failed to create conversation");
      }
    } catch (error: unknown) {
      toast.error("Error starting conversation: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRequestReferenceContact = async (referenceId: string) => {
    if (!currentUser) {
      toast.error("Please sign in to request reference contact");
      navigate("/register");
      return;
    }

    if (!digger) return;

    try {
      const { error } = await supabase
        .from("reference_contact_requests")
        .insert({
          reference_id: referenceId,
          consumer_id: currentUser.id,
          digger_id: digger.id,
        });

      if (error) throw error;

      toast.success("Request sent! The digger will be notified.");
      
      // Reload data to update request status
      loadData();
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === '23505') {
        toast.error("You've already requested this reference contact");
      } else {
        toast.error("Failed to send request");
      }
    }
  };

  const handleCallDigger = async () => {
    if (!currentUser) {
      toast.error("Please sign in to call this digger");
      navigate("/register");
      return;
    }

    if (!digger) return;

    // Record the call (this charges the digger, not the caller)
    const result = await recordCall(digger.id);
    
    if (result.success) {
      // Open the phone dialer with the digger's phone number
      window.location.href = `tel:${digger.phone}`;
    }
  };

  const handleUnlockContact = async () => {
    if (!currentUser) {
      toast.error("Please sign in to view contact information");
      navigate("/register");
      return;
    }

    if (!digger) return;

    setIsUnlocking(true);
    try {
      const data = await invokeEdgeFunction<{
        requiresGig?: boolean;
        notRelated?: boolean;
        alreadyPaid?: boolean;
        success?: boolean;
        message?: string;
        url?: string;
        totalCharge?: number;
        viewFee?: number;
        leadCost?: number;
      }>(supabase, "charge-profile-view", {
        body: { diggerId: digger.id },
      });

      // Handle access denied responses
      if (data.requiresGig) {
        toast.error("You must post at least one gig before you can view digger profiles.");
        navigate("/post-gig");
        return;
      }

      if (data.notRelated) {
        toast.error("You can only view diggers that are related to your posted gigs.");
        return;
      }

      if (data.alreadyPaid || data.success) {
        setHasViewAccess(true);
        toast.success(data.message || "Contact information unlocked! The digger has been charged.");
        
        // Track custom event for contact reveal
        if (fbConfigured) {
          try {
            const win = window as any;
            if (win.fbq) {
              win.fbq('trackCustom', 'ContactRevealed', {
                digger_id: digger.id,
                digger_profile_id: digger.id,
                consumer_id: currentUser?.id,
              });
            }
          } catch (error) {
            logger.warn('Facebook Pixel: Error tracking ContactRevealed event', error);
          }
        }
        
        // Reload data to refresh view access
        await loadData();
      } else if (data.url) {
        // Redirect to Stripe checkout (legacy flow - shouldn't happen with new subscription model)
        window.open(data.url, '_blank');
        toast.info(`Total charge: $${data.totalCharge} ($${data.viewFee} view fee + $${data.leadCost} lead cost)`);
      }
    } catch (error: unknown) {
      logger.error("Error unlocking contact:", error);
      const msg = error instanceof Error ? error.message : (error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : "");
      if (msg.includes("must post") || msg.includes("not related")) {
        toast.error(msg || "You can only view diggers related to your posted gigs.");
        if (msg.includes("must post")) {
          navigate("/post-gig");
        }
      } else {
        toast.error(msg || "Failed to unlock contact information");
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  /** Service location = where they offer service (e.g. Guangdong, China). Derive country for the flag from location text. */
  const getServiceLocationCountry = (): string | null => {
    const parts = [digger?.city, digger?.location].filter(Boolean).join(", ").trim();
    if (!parts) return null;
    const lastPart = parts.split(",").map((p) => p.trim()).filter(Boolean).pop() ?? "";
    return lastPart || null;
  };

  const getServiceLocationDisplay = (): string => {
    return [digger?.city, digger?.location].filter(Boolean).join(", ") || "";
  };

  const countryToFlag: Record<string, string> = {
    US: "🇺🇸", "United States": "🇺🇸", CA: "🇨🇦", Canada: "🇨🇦", GB: "🇬🇧", UK: "🇬🇧", "United Kingdom": "🇬🇧",
    AU: "🇦🇺", Australia: "🇦🇺", DE: "🇩🇪", Germany: "🇩🇪", FR: "🇫🇷", France: "🇫🇷", ES: "🇪🇸", Spain: "🇪🇸",
    IT: "🇮🇹", Italy: "🇮🇹", MX: "🇲🇽", Mexico: "🇲🇽", BR: "🇧🇷", Brazil: "🇧🇷", IN: "🇮🇳", India: "🇮🇳",
    CN: "🇨🇳", China: "🇨🇳", JP: "🇯🇵", Japan: "🇯🇵", KR: "🇰🇷", "South Korea": "🇰🇷", NL: "🇳🇱", Netherlands: "🇳🇱",
    SE: "🇸🇪", Sweden: "🇸🇪", NO: "🇳🇴", Norway: "🇳🇴", DK: "🇩🇰", Denmark: "🇩🇰", FI: "🇫🇮", Finland: "🇫🇮",
    PL: "🇵🇱", Poland: "🇵🇱", IE: "🇮🇪", Ireland: "🇮🇪", CH: "🇨🇭", Switzerland: "🇨🇭", AT: "🇦🇹", Austria: "🇦🇹",
    BE: "🇧🇪", Belgium: "🇧🇪", PT: "🇵🇹", Portugal: "🇵🇹", GR: "🇬🇷", Greece: "🇬🇷", NZ: "🇳🇿", "New Zealand": "🇳🇿",
  };
  const getServiceLocationDisplayWithFlags = (): string => {
    const raw = getServiceLocationDisplay();
    if (!raw) return "";
    let out = raw;
    for (const [name, flag] of Object.entries(countryToFlag)) {
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      out = out.replace(re, flag);
    }
    return out;
  };

  const getInitials = (handle: string | null) => {
    if (!handle) return "DG";
    return handle.slice(0, 2).toUpperCase();
  };

  const formatHourlyRate = () => {
    if (digger?.hourly_rate_min && digger?.hourly_rate_max) {
      return `$${digger.hourly_rate_min}-${digger.hourly_rate_max}/hr`;
    }
    if (digger?.hourly_rate) {
      return `$${digger.hourly_rate}/hr`;
    }
    return null;
  };

  const getDisplayProfession = () => {
    // First priority: profile_name or business_name (user-defined profile names)
    const profileName = digger?.profile_name || digger?.business_name;
    if (profileName && profileName !== 'Not specified') {
      return profileName;
    }
    
    // Second priority: custom occupation title
    if (digger?.custom_occupation_title) {
      const titles = digger.custom_occupation_title.split(", ");
      const primaryIndex = digger.primary_profession_index || 0;
      return titles[primaryIndex] || titles[0] || digger.custom_occupation_title;
    }
    
    // Fallback: profession field
    return digger?.profession || "";
  };

  const getOccupationBadge = () => {
    const primaryIndex = digger?.primary_profession_index || 0;
    
    // Combine SIC and NAICS codes to respect primary index
    const allCodes = [
      ...(digger?.sic_code || []).map(code => ({ type: "SIC", code })),
      ...(digger?.naics_code || []).map(code => ({ type: "NAICS", code }))
    ];
    
    if (allCodes.length > 0) {
      const primaryCode = allCodes[primaryIndex] || allCodes[0];
      return { 
        label: `${primaryCode.type} Code`, 
        value: primaryCode.code,
        isPrimary: primaryIndex < allCodes.length
      };
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!digger) return null;

  const displayProfession = getDisplayProfession();
  const occupationBadge = getOccupationBadge();
  // User-level verification (same as Gigger profile when user has both roles)
  const p = digger.profiles as { id_verified?: boolean | null; phone_verified?: boolean | null; email_verified?: boolean | null; payment_verified?: boolean | null } | undefined;
  const verificationItems = [
    { label: "ID verified", isActive: p?.id_verified != null ? !!p.id_verified : !!digger.verified, icon: User },
    { label: "Phone", isActive: p?.phone_verified != null ? !!p.phone_verified : (!!digger.phone && digger.phone !== "Not specified"), icon: Phone },
    { label: "Email", isActive: p?.email_verified != null ? !!p.email_verified : !!digger.profiles?.email, icon: Mail },
    { label: "Payment", isActive: p?.payment_verified != null ? !!p.payment_verified : !!(digger.stripe_connect_onboarded || digger.stripe_connect_charges_enabled), icon: CreditCard },
  ];

  // Effective avatar: user-level (profiles.avatar_url) first so same as Gigger profile, then digger profile_image_url
  const DEFAULT_AVATAR = "/default-avatar.svg";
  const effectiveAvatarUrl = digger.profiles?.avatar_url
    || digger.profile_image_url
    || (isOwnProfile ? (currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture) : null)
    || DEFAULT_AVATAR;
  const displayName = formatRealName(digger.profiles?.full_name) || digger.profile_name || "Main Profile";
  // Username (handle): user-level profiles.handle first so synced with Gigger, then digger handle
  const profilesHandle = (digger.profiles as { handle?: string | null } | undefined)?.handle;
  const handleDisplay = (profilesHandle ? `@${String(profilesHandle).replace(/^@/, "")}` : "") || (digger.handle ? `@${String(digger.handle).replace(/^@/, "")}` : "");
  /** Profile title from first profile creation (profile_name/business_name), then custom title, categories, profession */
  const profileTitleSub =
    (digger.profile_name && digger.profile_name !== "Not specified" ? digger.profile_name : null) ||
    (digger.business_name && digger.business_name !== "Not specified" ? digger.business_name : null) ||
    digger.custom_occupation_title ||
    digger.digger_categories?.[0]?.categories?.name ||
    digger.profession ||
    "Freelancer";
  // User-level location and time (same as Gigger profile when user has both roles)
  const profilesCountry = (digger.profiles as any)?.country ?? null;
  const profilesTimezone = (digger.profiles as any)?.timezone ?? null;
  const locationCountry = profilesCountry || getServiceLocationCountry() || digger.country || "";
  const localTimeStr = (() => {
    if (profilesTimezone?.trim()) {
      try {
        return new Intl.DateTimeFormat("en-US", {
          timeZone: profilesTimezone.trim(),
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short",
        }).format(new Date());
      } catch {
        return getLocalTimeForCountry(locationCountry);
      }
    }
    return getLocalTimeForCountry(locationCountry);
  })();
  /** Get country code for location (e.g. "ES", "MX") - for flag image and display; prefer user-level profiles.country */
  const getLocationCountryCode = (): string => {
    const c = locationCountry || (getBaseLocationDisplay().split(",").map((p) => p.trim()).filter(Boolean).pop() ?? "") || "";
    const code = getCodeForCountryName(c);
    if (code) return code;
    const firstWord = getBaseLocationDisplay().trim().split(/\s+/)[0] || "";
    if (firstWord && (firstWord.length === 2 || firstWord.length === 3)) {
      const fromFirst = getCodeForCountryName(firstWord);
      if (fromFirst) return fromFirst;
    }
    return "";
  };
  // Location: prefer full location (state, country) from digger so synced with Gigger, then profiles country
  const displayLocationText = getBaseLocationDisplay() || (profilesCountry ? (getLocationCountryCode() ? `${getCodeForCountryName(profilesCountry) || getLocationCountryCode()} · ${profilesCountry}` : profilesCountry) : "");

  /** Job success: completion_rate (0–100). Uncompletion = 100 - completion_rate. Color by tier. */
  const getJobSuccessColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-500";
    if (rate >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };
  const completionRate = digger.completion_rate != null ? Math.min(100, Math.max(0, Number(digger.completion_rate))) : null;
  const JobSuccessDisplay = () => (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <CheckCircle2 className={`h-4 w-4 shrink-0 ${completionRate == null ? "text-muted-foreground" : completionRate >= 90 ? "text-emerald-600" : completionRate >= 70 ? "text-amber-600" : "text-rose-600"}`} />
        <span className="text-sm font-medium tabular-nums">{completionRate != null ? `${completionRate}%` : "—"}</span>
      </div>
      {completionRate != null ? (
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden" title={`${completionRate}% jobs completed`}>
          <div className={`h-full rounded-full transition-all ${getJobSuccessColor(completionRate)}`} style={{ width: `${completionRate}%` }} />
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">No data yet</p>
      )}
    </div>
  );

  const StarRatingDisplay = () => {
    const rating = digger.average_rating ?? 0;
    const total = digger.total_ratings ?? 0;
    const isNew = total === 0;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 shrink-0 ${isNew ? "text-muted-foreground/50" : i <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
        ))}
        <span className="ml-1 text-sm font-medium tabular-nums">{isNew ? "New" : rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={profilePhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfilePhotoFileChange}
      />
      <Dialog open={profilePhotoDialogOpen} onOpenChange={setProfilePhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleProfilePhotoReplace}
              disabled={profilePhotoUploading}
            >
              <Upload className="h-4 w-4" />
              {profilePhotoUploading ? "Uploading…" : "Replace image"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleProfilePhotoRemove}
            >
              <Trash2 className="h-4 w-4" />
              Remove image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <input
        ref={coverPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverPhotoFileChange}
      />
      <Dialog open={coverPhotoDialogOpen} onOpenChange={setCoverPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cover photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleCoverPhotoReplace}
              disabled={coverPhotoUploading}
            >
              <ImagePlus className="h-4 w-4" />
              {coverPhotoUploading ? "Uploading…" : "Replace image"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCoverPhotoRemove}
            >
              <Trash2 className="h-4 w-4" />
              Remove image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={profileHeaderEditOpen} onOpenChange={setProfileHeaderEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your freelancer headline, hourly rate, photo, and cover.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-2">
            <div className="space-y-2">
              <label htmlFor="profile-name-edit" className="text-sm font-medium">Freelancer headline</label>
              <Input
                id="profile-name-edit"
                value={profileNameDraft}
                onChange={(e) => setProfileNameDraft(e.target.value)}
                placeholder="e.g. Main Profile"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hourly rate ($/hr)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={hourlyRateMinDraft}
                  onChange={(e) => setHourlyRateMinDraft(e.target.value)}
                  placeholder="Min"
                  className="w-full"
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={hourlyRateMaxDraft}
                  onChange={(e) => setHourlyRateMaxDraft(e.target.value)}
                  placeholder="Max (optional)"
                  className="w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty for &quot;Contact for pricing&quot;</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile photo</label>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={effectiveAvatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {getInitials(digger.handle || digger.business_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={handleProfilePhotoReplace} disabled={profilePhotoUploading}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    {profilePhotoUploading ? "Uploading…" : "Change photo"}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleProfilePhotoRemove}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover photo</label>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={handleCoverPhotoReplace} disabled={coverPhotoUploading}>
                  <ImagePlus className="h-4 w-4 mr-1.5" />
                  {coverPhotoUploading ? "Uploading…" : "Change cover"}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive justify-start" onClick={handleCoverPhotoRemove}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remove cover
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setProfileHeaderEditOpen(false)}>Cancel</Button>
              <Button onClick={saveProfileHeaderEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SEOHead
        title={`${digger.business_name} - ${displayProfession} in ${digger.location}`}
        description={`${digger.bio || `Freelancer ${displayProfession} services in ${digger.location}`}. ${digger.average_rating ? `Rated ${digger.average_rating}/5 stars` : 'Available for hire'}. ${digger.hourly_rate ? `Starting at $${digger.hourly_rate}/hour` : 'Contact for pricing'}.`}
        keywords={`${displayProfession}, ${digger.location}, contractor, freelancer, ${(digger.skills || digger.keywords || []).join(', ')}`}
        ogType="profile"
        ogImage={effectiveAvatarUrl}
        structuredData={generateLocalBusinessSchema({
          name: digger.business_name,
          description: digger.bio || `Professional ${displayProfession} services`,
          url: window.location.href,
          telephone: digger.phone,
          address: {
            addressLocality: digger.location
          },
          geo: digger.location_lat && digger.location_lng ? {
            latitude: digger.location_lat,
            longitude: digger.location_lng
          } : undefined,
          priceRange: digger.hourly_rate ? `$${digger.hourly_rate}+` : undefined,
          aggregateRating: digger.average_rating ? {
            ratingValue: digger.average_rating,
            reviewCount: digger.total_ratings || 0
          } : undefined,
          image: effectiveAvatarUrl
        })}
      />

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
          <div className="lg:col-span-7 space-y-4 order-2 lg:order-1 min-w-0">
            {(!isOwnProfile || viewAsClient) ? (
              <>
                {/* Hero: minimal header */}
                <Card id="profile-header-section" className="overflow-hidden border shadow-none bg-card">
                  <div className="relative">
                    <div
                      className="h-28 sm:h-32 md:h-36 w-full bg-muted"
                      style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    />
                    <div className="absolute left-3 sm:left-4 -bottom-8">
                      <div className="relative">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-background">
                          <AvatarImage src={effectiveAvatarUrl} alt={digger.business_name} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                            {(digger.business_name || digger.profile_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/50"}`} title={isOnline ? "Online" : "Offline"} />
                      </div>
                    </div>
                  </div>
                  <CardContent className="pt-10 sm:pt-11 pb-4 px-3 sm:px-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
                          {handleDisplay && <span className="text-sm font-medium text-muted-foreground">{handleDisplay}</span>}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground/90 min-w-0">{profileTitleSub}</p>
                          <span className="text-xs font-medium text-muted-foreground shrink-0">{formatHourlyRate() || "Contact for pricing"}</span>
                        </div>
                        {digger.tagline && <p className="mt-0.5 text-xs text-muted-foreground">{digger.tagline}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {(displayLocationText || getBaseLocationDisplay()) && (
                            <span className="flex items-center gap-2">
                              {getLocationCountryCode() ? (
                                <>
                                  <img
                                    src={`https://flagcdn.com/w20/${getLocationCountryCode().toLowerCase()}.png`}
                                    alt=""
                                    className="h-4 w-5 object-cover rounded-sm shrink-0"
                                    width={20}
                                    height={15}
                                  />
                                  <span className="uppercase font-medium text-foreground text-sm">{getLocationCountryCode()}</span>
                                </>
                              ) : null}
                              <span>{displayLocationText || getBaseLocationDisplay()}</span>
                            </span>
                          )}
                          {localTimeStr && (
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">•</span>
                              <span>{localTimeStr} local</span>
                            </span>
                          )}
                          {digger.created_at && (
                            <span className="flex items-center gap-1">
                              <span className="text-muted-foreground/70">•</span>
                              <span>Joined {formatJoinDate(digger.created_at)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOwnProfile && viewAsClient && (
                          <Button variant="outline" size="sm" onClick={openProfileHeaderEditModal}>
                            <Pencil className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Rating</span>
                        <StarRatingDisplay />
                      </div>
                      <div className="flex flex-col gap-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Reviews</span>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium tabular-nums">{digger.total_ratings ?? 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Earnings</span>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium tabular-nums">{formatEarningsCompact(totalEarnings)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">Job Success</span>
                        <JobSuccessDisplay />
                      </div>
                    </div>
                    {references.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">{references.length} Recommendation{references.length !== 1 ? "s" : ""}</p>
                    )}
                  </CardContent>
                </Card>

                {digger.bio && (
                  <Card className="border shadow-none">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">About</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 pb-3">
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{digger.bio}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio */}
                {(portfolioItems.length > 0 || digger.portfolio_url || (digger.portfolio_urls && digger.portfolio_urls.length > 0)) && (
                  <Card className="border shadow-none">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 pb-3">
                      {portfolioItems.length > 0 ? (
                        <PortfolioDisplay items={portfolioItems} legacyPortfolioUrl={digger.portfolio_url} />
                      ) : (
                        <>
                          {digger.portfolio_url && (
                            <a href={digger.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline font-medium">
                              View portfolio →
                            </a>
                          )}
                          {(digger.portfolio_urls || []).map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline text-sm mt-1">
                              {url}
                            </a>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Work history / references */}
                <ReferencesSection references={references} />

                {/* Certifications (Gigger view - no edit) */}
                {certifications.length > 0 && (
                  <CertificationsSection certifications={certifications} isOwnProfile={false} />
                )}
                {experiences.length > 0 && (
                  <ExperienceSection experiences={experiences} isOwnProfile={false} />
                )}

                <Card className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Reviews & ratings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <RatingsList diggerId={digger.id} isDigger={false} diggerName={digger.business_name} />
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Owner View - Same reference layout with management actions */
              <>
              <section id="profile-header-section" className="overflow-hidden border-b border-border bg-card">
                <div className="relative">
                  <div
                    className="h-28 sm:h-32 md:h-36 w-full bg-muted"
                    style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  />
                  <div className="absolute left-3 sm:left-4 -bottom-8">
                    <div className="relative">
                      <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-background">
                        <AvatarImage src={effectiveAvatarUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">{getInitials(digger.handle || digger.business_name)}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/50"}`} title={isOnline ? "Online" : "Offline"} />
                    </div>
                  </div>
                </div>
                <CardContent className="pt-10 sm:pt-11 pb-4 px-3 sm:px-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
                        {handleDisplay && <span className="text-sm font-medium text-muted-foreground">{handleDisplay}</span>}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground/90 min-w-0">{profileTitleSub}</p>
                        <span className="text-xs font-medium text-muted-foreground shrink-0">{formatHourlyRate() || "Contact for pricing"}</span>
                      </div>
                      {digger.tagline && <p className="mt-0.5 text-xs text-muted-foreground">{digger.tagline}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {(displayLocationText || getBaseLocationDisplay()) && (
                          <span className="flex items-center gap-1.5">
                            {getLocationCountryCode() ? (
                              <>
                                <img src={`https://flagcdn.com/w20/${getLocationCountryCode().toLowerCase()}.png`} alt="" className="h-3.5 w-4 object-cover rounded-sm shrink-0" width={20} height={15} />
                                <span className="uppercase font-medium text-foreground text-xs">{getLocationCountryCode()}</span>
                              </>
                            ) : null}
                            <span>{displayLocationText || getBaseLocationDisplay()}</span>
                          </span>
                        )}
                        {localTimeStr && <span className="flex items-center gap-1"><span className="text-muted-foreground/70">·</span><span>{localTimeStr} local</span></span>}
                        {digger.created_at && <span className="flex items-center gap-1"><span className="text-muted-foreground/70">·</span><span>Joined {formatJoinDate(digger.created_at)}</span></span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" onClick={openProfileHeaderEditModal} className="text-xs h-8">
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile"><Share2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-0"><span className="text-[10px] font-medium text-muted-foreground uppercase">Rating</span><StarRatingDisplay /></div>
                    <div className="flex flex-col gap-0"><span className="text-[10px] font-medium text-muted-foreground uppercase">Reviews</span><div className="flex items-center gap-1"><MessageSquare className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium tabular-nums">{digger.total_ratings ?? 0}</span></div></div>
                    <div className="flex flex-col gap-0"><span className="text-[10px] font-medium text-muted-foreground uppercase">Earnings</span><div className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium tabular-nums">{formatEarningsCompact(totalEarnings)}</span></div></div>
                    <div className="flex flex-col gap-0"><span className="text-[10px] font-medium text-muted-foreground uppercase">Job Success</span><JobSuccessDisplay /></div>
                  </div>
                  {references.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{references.length} Recommendation{references.length !== 1 ? "s" : ""}</p>}
                </CardContent>
              </section>

              <section id="about-section" className="py-4 border-b border-border">
                <div className="pb-1.5 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">About</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSectionModal("about")} title="Edit About"><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
                <div>
                  {digger.bio ? (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{digger.bio}</p>
                  ) : (
                    <div className="rounded-lg border border-dashed border-muted bg-muted/20 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Add a bio to help Giggers learn about your services</p>
                      <Button size="sm" onClick={() => openSectionModal("about")} className="text-xs"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Add Bio</Button>
                    </div>
                  )}
                </div>
              </section>

              <section id="portfolio-section" className="py-4 border-b border-border">
                <div className="pb-1.5 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">Portfolio</h2>
                  {isOwnProfile && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSectionModal("portfolio")} title="Edit Portfolio"><Pencil className="h-3.5 w-3.5" /></Button>}
                </div>
                <div>
                  {portfolioItems.length > 0 || digger.portfolio_url ? (
                    <PortfolioDisplay items={portfolioItems} legacyPortfolioUrl={digger.portfolio_url} />
                  ) : (
                    isOwnProfile ? (
                      <div className="rounded-lg border border-dashed border-muted bg-muted/20 p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Add work samples.</p>
                        <Button size="sm" onClick={() => openSectionModal("portfolio")} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Add portfolio</Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No portfolio yet.</p>
                    )
                  )}
                </div>
              </section>

              <section className="py-4 border-b border-border" id="references-section">
                <div className="pb-1.5 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">Prior Job References</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSectionModal("references")} title="Edit References"><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
                <div>
                  {references.length > 0 ? (
                    <div className="space-y-2 min-w-0 overflow-hidden">
                      {references.map((ref) => (
                        <div key={ref.id} className="p-3 rounded-md border border-border/60 bg-muted/10 overflow-hidden min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">{ref.reference_name}</span>
                            {ref.verification_tier === "platform" ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-0">Verified</Badge>
                            ) : ref.verification_tier === "email" || ref.is_verified ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0">Email verified</Badge>
                            ) : null}
                          </div>
                          {ref.project_description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-all">{ref.project_description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-muted bg-muted/20 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Add references from past Giggers</p>
                      <Button size="sm" variant="outline" onClick={() => openSectionModal("references")} className="text-xs"><Plus className="h-3.5 w-3.5 mr-1.5" />Add reference</Button>
                    </div>
                  )}
                </div>
              </section>

            <section className="py-4">
              <div className="pb-1.5">
                <h2 className="text-sm font-medium text-muted-foreground">Reviews & Ratings</h2>
              </div>
              <div>
                <RatingsList 
                  diggerId={digger.id} 
                  isDigger={true}
                  diggerName={digger.business_name}
                />
              </div>
            </section>

            <section className="py-4 border-t border-border" id="certifications-section">
              <CertificationsSection
                certifications={certifications}
                isOwnProfile={isOwnProfile}
                onEdit={() => {
                  setCertificationEditId(null);
                  setCertificationEditorOpen(true);
                }}
                onEditItem={(cert) => {
                  setCertificationEditId(cert.id);
                  setCertificationEditorOpen(true);
                }}
              />
            </section>

            <section className="py-4 border-t border-border" id="experience-section">
              <ExperienceSection
                experiences={experiences}
                isOwnProfile={isOwnProfile}
                onEdit={() => {
                  setExperienceEditId(null);
                  setExperienceEditorOpen(true);
                }}
                onEditItem={(exp) => {
                  setExperienceEditId(exp.id);
                  setExperienceEditorOpen(true);
                }}
              />
            </section>

            {certificationEditorOpen && (
              <CertificationEditorModal
                open={certificationEditorOpen}
                onOpenChange={(open) => {
                  setCertificationEditorOpen(open);
                  if (!open) setCertificationEditId(null);
                }}
                diggerProfileId={digger.id}
                certifications={certifications}
                scrollToCertificationId={certificationEditId}
                onSaved={async () => {
                  const { data } = await (supabase
                    .from("digger_certifications" as any))
                    .select("*")
                    .eq("digger_profile_id", digger.id)
                    .order("sort_order", { ascending: true });
                  setCertifications((data || []) as unknown as DiggerCertification[]);
                }}
              />
            )}
            {experienceEditorOpen && (
              <ExperienceEditorModal
                open={experienceEditorOpen}
                onOpenChange={(open) => {
                  setExperienceEditorOpen(open);
                  if (!open) setExperienceEditId(null);
                }}
                diggerProfileId={digger.id}
                experiences={experiences}
                scrollToExperienceId={experienceEditId}
                onSaved={async () => {
                  const { data } = await (supabase
                    .from("digger_experience" as any))
                    .select("*")
                    .eq("digger_profile_id", digger.id)
                    .order("sort_order", { ascending: true });
                  setExperiences((data || []) as unknown as DiggerExperience[]);
                }}
              />
            )}
          </>
            )}
          </div>

          {/* Sidebar - 30% width on desktop */}
          <div className="lg:col-span-3 order-1 lg:order-2 min-w-0 w-full">
            <div className="space-y-3 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              <Card className="w-full border shadow-none">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Verifications</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {verificationItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                          <item.icon className={`h-3 w-3 ${item.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-[10px] font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {hasViewAccess && (
                <DiggerPricingSelector
                  diggerId={digger.id}
                  gigId=""
                  pricingModel={digger.pricing_model || 'both'}
                  subscriptionTier={digger.subscription_tier || 'free'}
                  hourlyRateMin={digger.hourly_rate_min}
                  hourlyRateMax={digger.hourly_rate_max}
                  offersFreEstimates={digger.offers_free_estimates}
                  businessName={digger.business_name}
                  onSelectPricing={(model) => {
                    toast.success(`Lead purchased successfully! You can now contact ${digger.business_name}`);
                  }}
                />
              )}
              {isOwnProfile && (
                <Card className="w-full border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Profile completion</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-lg font-semibold tabular-nums text-foreground">{profileDetailCompletion.score}%</span>
                      <span className="text-[10px] text-muted-foreground">
                        {profileDetailCompletion.items.filter((i) => i.completed).length}/10
                      </span>
                    </div>
                    <Progress value={profileDetailCompletion.score} className="h-1.5 mb-2" />
                    <ul className="space-y-0.5 text-[10px]">
                      {profileDetailCompletion.items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleCompletionFactorClick(item.id)}
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50 transition-colors"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                            ) : (
                              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/50" />
                            )}
                            <span className={item.completed ? "text-muted-foreground" : "text-foreground"}>{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              <Card className="w-full border shadow-none">
                <CardHeader className="py-2 px-3 sm:px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-4 pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Availability</span>
                    {isOwnProfile && (
                      <button type="button" onClick={() => openSectionModal("availability")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`w-full inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-left ${isOwnProfile ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"}`}
                    onClick={() => isOwnProfile && openSectionModal("availability")}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-gray-400"}`} title={isOnline ? "Online now" : "Offline"} />
                    <span>{getAvailabilityLabel(digger.availability)}</span>
                    {isOnline && <span className="text-green-600 dark:text-green-400">· Online</span>}
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                      {(() => {
                        const locationCountry = digger.country || getServiceLocationCountry() || "";
                        const locationCode = getCodeForCountryName(locationCountry?.trim() || "") || (locationCountry?.trim().length === 2 ? locationCountry.trim().toUpperCase() : "");
                        return locationCode ? (
                          <img
                            src={`https://flagcdn.com/w40/${locationCode.toLowerCase()}.png`}
                            alt=""
                            width={32}
                            height={24}
                            className="h-5 w-6 shrink-0 rounded object-cover"
                            loading="lazy"
                            title="Location"
                          />
                        ) : (
                          <CountryFlagIcon
                            countryNameOrCode={locationCountry}
                            size="md"
                            title="Location"
                            className="shrink-0 h-5 w-6"
                          />
                        );
                      })()}
                      <p className="text-xs text-foreground min-w-0">
                        {getBaseLocationDisplay() || "Not specified"}
                      </p>
                    </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Service location</span>
                    {isOwnProfile && ((digger.service_countries?.length ?? 0) > 0 || (digger.country && (!digger.service_countries || digger.service_countries.length === 0))) && (
                      <button type="button" onClick={() => openSectionModal("service_location")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                    {((digger.service_countries?.length ?? 0) > 0 || (digger.country && (!digger.service_countries || digger.service_countries.length === 0))) ? (
                      <div className="space-y-1 -mt-0.5">
                        {((digger.service_countries?.length ?? 0) > 0 ? digger.service_countries! : [digger.country!]).map((c, idx) => {
                          const serviceCountryCode = getCodeForCountryName(c?.trim() || "") || (c?.trim().length === 2 ? c.trim().toUpperCase() : "");
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`flex w-full items-center gap-2 text-left ${isOwnProfile ? "cursor-pointer hover:bg-muted/30 rounded py-0.5" : "cursor-default"}`}
                              onClick={() => isOwnProfile && openSectionModal("service_location")}
                            >
                              {serviceCountryCode ? (
                                <img
                                  src={`https://flagcdn.com/w40/${serviceCountryCode.toLowerCase()}.png`}
                                  alt=""
                                  width={24}
                                  height={18}
                                  className="h-4 w-6 shrink-0 rounded object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <CountryFlagIcon countryNameOrCode={c} size="md" className="shrink-0 h-4 w-6" />
                              )}
                              <span className="text-xs text-foreground">{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("service_location")}>
                        <Plus className="h-3 w-3 shrink-0" /> Add
                      </button>
                    )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Website</span>
                    {isOwnProfile && digger.website_url && (
                      <button type="button" onClick={() => openSectionModal("website")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {digger.website_url ? (
                    <a href={digger.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline truncate -mt-0.5">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span className="truncate">{digger.website_url}</span>
                    </a>
                  ) : (
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-0.5" onClick={() => isOwnProfile && openSectionModal("website")}>
                      <Plus className="h-3 w-3 shrink-0" /> Add
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">GitHub</span>
                    {isOwnProfile && githubUrl && (
                      <button type="button" onClick={openGithubModal} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {githubUrl ? (
                    <div className="flex items-center justify-between gap-2 -mt-0.5">
                      <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1 text-xs text-primary hover:underline truncate">
                        <Code2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{githubUrl}</span>
                      </a>
                      {githubAvatarUrl ? (
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full ring border-border overflow-hidden bg-muted" title={`GitHub: ${githubUsername}`}>
                          <img src={githubAvatarUrl} alt={`${githubUsername} on GitHub`} className="h-8 w-8 object-cover" />
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-0.5" onClick={() => isOwnProfile && openGithubModal()}>
                      <Plus className="h-3 w-3 shrink-0" /> Connect
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Profession</span>
                    {isOwnProfile && getDisplayedProfessions().length > 0 && (
                      <button type="button" onClick={() => openSectionModal("profession")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {getDisplayedProfessions().length > 0 ? (
                    <button
                      type="button"
                      className={`flex flex-wrap gap-1 text-left -mt-0.5 ${isOwnProfile ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => isOwnProfile && openSectionModal("profession")}
                    >
                      {getDisplayedProfessions().map((name, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded border border-border bg-muted/20 px-1.5 py-0.5 text-xs">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-violet-500" />
                          {name}
                        </span>
                      ))}
                    </button>
                  ) : (
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-0.5" onClick={() => isOwnProfile && openSectionModal("profession")}>
                      <Plus className="h-3 w-3 shrink-0" /> Add
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Skills</span>
                    {isOwnProfile && getDiggerSkillNames(digger).length > 0 && (
                      <button type="button" onClick={() => openSectionModal("skills")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {getDiggerSkillNames(digger).length > 0 ? (
                    <button
                      type="button"
                      className={`flex flex-wrap gap-1 text-left -mt-0.5 ${isOwnProfile ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => isOwnProfile && openSectionModal("skills")}
                    >
                      {getDiggerSkillNames(digger).map((skill, idx) => (
                        <span key={idx} className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5 text-xs">
                          {skill}
                        </span>
                      ))}
                    </button>
                  ) : (
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-0.5" onClick={() => isOwnProfile && openSectionModal("skills")}>
                      <Plus className="h-3 w-3 shrink-0" /> Add
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Social</span>
                    {isOwnProfile && digger.social_links && Object.entries(digger.social_links).filter(([k, v]) => k !== "github" && Boolean(String(v).trim())).length > 0 && (
                      <button type="button" onClick={() => openSectionModal("social")} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {(() => {
                    const socialExcludingGithub = digger.social_links && typeof digger.social_links === "object"
                      ? Object.entries(digger.social_links).filter(([k, v]) => k !== "github" && Boolean(String(v).trim()))
                      : [];
                    return socialExcludingGithub.length > 0 ? (
                      <div className="flex flex-col gap-1 -mt-0.5">
                        {socialExcludingGithub.map(([platform, url]) => {
                          const href = String(url).trim();
                          const label = socialPlatforms.find((p) => p.key === platform)?.label || platform;
                          const faviconUrl = getSocialFaviconUrl(href);
                          return (
                            <div key={platform} className="flex items-center justify-between gap-2">
                              <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex items-center gap-1 text-xs text-primary hover:underline truncate" title={href}>
                                <span className="text-foreground shrink-0">{label}</span>
                                <span className="truncate">{href}</span>
                              </a>
                              {faviconUrl ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded border border-border overflow-hidden bg-muted" title={label}>
                                  <img src={faviconUrl} alt="" className="h-6 w-6 object-cover" />
                                </a>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-0.5" onClick={() => isOwnProfile && openSectionModal("social")}>
                        <Plus className="h-3 w-3 shrink-0" /> Add links
                      </button>
                    );
                  })()}
                </CardContent>
              </Card>
              {relatedDiggers.length > 0 && (
                <Card className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">People also viewed</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <ul className="space-y-1">
                      {relatedDiggers.slice(0, 6).map((d) => {
                        const displayName = formatRealName(d.profiles?.full_name) || d.profile_name || d.business_name;
                        const profileTitle = d.custom_occupation_title || d.digger_categories?.[0]?.categories?.name || d.profession || null;
                        return (
                          <li key={d.id}>
                            <div className="flex items-center gap-2 w-full text-left rounded p-1.5 cursor-default">
                              <Avatar className="h-7 w-7 shrink-0 overflow-hidden">
                                <AvatarImage src={d.profile_image_url || DEFAULT_AVATAR} alt="" className="blur-md scale-110 saturate-0 select-none" />
                                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">?</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-xs truncate">{displayName}</p>
                                {profileTitle ? <p className="text-[10px] text-muted-foreground truncate">{profileTitle}</p> : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {(!isOwnProfile || viewAsClient) && (
                <>
                  {(digger.digger_categories?.length ?? 0) > 0 && (
                    <Card className="rounded-xl border-border/70">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Profession</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(digger.digger_categories || []).map((dc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                              <span className="h-2 w-2 rounded-full shrink-0 bg-violet-500" />
                              {dc.categories?.name || ""}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {getDiggerSkillNames(digger).length > 0 && (
                    <Card className="rounded-xl border-border/70">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Skills</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {getDiggerSkillNames(digger).map((skill, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Google Search Preview */}
              {digger.total_ratings > 0 && (
                <RichSnippetPreview
                  businessName={digger.business_name}
                  rating={digger.average_rating}
                  reviewCount={digger.total_ratings}
                  priceRange={formatHourlyRate() || undefined}
                  location={digger.location}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Dialog open={profileManagerOpen} onOpenChange={setProfileManagerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Profiles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {ownerProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div>
                  <p className="font-medium">{profile.profile_name || profile.business_name || "Unnamed Profile"}</p>
                  <p className="text-xs text-muted-foreground">{profile.is_primary ? "Primary profile" : "Secondary profile"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigate(
                        getCanonicalDiggerProfilePath({
                          handle: profile.handle,
                          diggerId: profile.id,
                        }) || `/digger/${profile.id}`
                      );
                      setProfileManagerOpen(false);
                    }}
                  >
                    Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(profile.id)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={sectionEditor.open}
        onOpenChange={(open) => setSectionEditor((prev) => (open ? prev : { open: false, section: null }))}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>
              {sectionEditor.section === "about" && (digger?.bio ? "Edit About" : "Add your bio")}
              {sectionEditor.section === "skills" && "Edit Skills"}
              {sectionEditor.section === "profession" && "Edit Profession"}
              {sectionEditor.section === "work" && "Edit Work Samples"}
              {sectionEditor.section === "portfolio" && "Edit Portfolio"}
              {sectionEditor.section === "availability" && "Edit Availability"}
              {sectionEditor.section === "location" && "Edit Location"}
              {sectionEditor.section === "service_location" && "Edit Service Location"}
              {sectionEditor.section === "website" && "Edit Website"}
              {sectionEditor.section === "social" && "Social profiles"}
              {sectionEditor.section === "references" && "References"}
              {sectionEditor.section === "reviews" && "Reviews"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6 space-y-4">
            {sectionEditor.section === "about" && digger && (
              <>
                <p className="text-sm text-muted-foreground">
                  Help Giggers get to know you. Use AI to draft a bio from your profession and experience, or write your own below—you can edit anytime.
                </p>
                <BioGenerator
                  profession={digger.profession || digger.business_name || "General Services"}
                  currentBio={aboutDraft}
                  onBioGenerated={(bio) => {
                    setAboutDraft(bio);
                    toast.success("Bio added below—edit if you like, then Save.");
                  }}
                  defaultExpanded
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Your bio</label>
                  <Textarea
                    value={aboutDraft}
                    onChange={(e) => setAboutDraft(e.target.value)}
                    rows={8}
                    placeholder="Describe your services and experience so Giggers can see why you’re the right fit for their gig."
                    className="resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "skills" && (
              <>
                <p className="text-sm text-muted-foreground">Select the skills you want to showcase on your profile.</p>
                {selectedSkillsDraft.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Selected ({selectedSkillsDraft.length}) — click to remove</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkillsDraft.map((skillName) => (
                        <span
                          key={skillName}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background pl-2.5 pr-1.5 py-1 text-sm"
                        >
                          <span>{skillName}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSkillsDraft((prev) => prev.filter((x) => x !== skillName))}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${skillName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="max-h-[360px] overflow-y-auto space-y-3 border rounded-md p-3">
                  {skillsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading skills...</p>
                  ) : (
                    Object.entries(skillsByCategory).map(([categoryName, categorySkills]) => (
                      <details key={categoryName} className="rounded border border-border/70 bg-background/30">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">
                          {categoryName}
                        </summary>
                        <div className="px-2 pb-2 space-y-1.5">
                          {categorySkills.map((skill) => {
                            const checked = selectedSkillsDraft.includes(skill.name);
                            return (
                              <label key={skill.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedSkillsDraft((prev) =>
                                      checked ? prev.filter((x) => x !== skill.name) : [...prev, skill.name]
                                    );
                                  }}
                                  className="rounded"
                                />
                                <span>{skill.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </details>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Add additional skill</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={additionalSkillDraft}
                      onChange={(e) => setAdditionalSkillDraft(e.target.value)}
                      placeholder="Type a custom skill"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const next = additionalSkillDraft.trim();
                        if (!next) return;
                        const normalized = next;
                        if (selectedSkillsDraft.some((s) => s.toLowerCase() === normalized.toLowerCase())) return;
                        setSelectedSkillsDraft((prev) => [...prev, normalized]);
                        setAdditionalSkillDraft("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {selectedSkillsDraft.filter((name) => !dbSkillNameSet.has(name)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSkillsDraft
                        .filter((name) => !dbSkillNameSet.has(name))
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                            onClick={() => setSelectedSkillsDraft((prev) => prev.filter((x) => x !== name))}
                            title="Remove custom skill"
                          >
                            {name}
                            <span className="text-muted-foreground">x</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "profession" && (
              <>
                <p className="text-sm text-muted-foreground">Select the profession items you want to showcase on your profile.</p>
                {selectedProfessionsDraft.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Selected ({selectedProfessionsDraft.length}) — click to remove</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessionsDraft.map((professionName) => (
                        <span
                          key={professionName}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background pl-2.5 pr-1.5 py-1 text-sm"
                        >
                          <span>{professionName}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProfessionsDraft((prev) => prev.filter((x) => x !== professionName))}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${professionName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="max-h-[360px] overflow-y-auto space-y-3 border rounded-md p-3">
                  {dbProfessionGroups.map((group) => (
                    <details key={group.category} className="rounded border border-border/70 bg-background/30">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">
                        {group.category}
                      </summary>
                      <div className="px-2 pb-2 space-y-1.5">
                        {group.items.map((name) => {
                          const checked = selectedProfessionsDraft.includes(name);
                          return (
                            <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedProfessionsDraft((prev) =>
                                    checked ? prev.filter((x) => x !== name) : [...prev, name]
                                  )
                                }
                                className="rounded"
                              />
                              <span>{name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Add additional profession</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={additionalProfessionDraft}
                      onChange={(e) => setAdditionalProfessionDraft(e.target.value)}
                      placeholder="Type a custom profession"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const next = additionalProfessionDraft.trim();
                        if (!next) return;
                        setSelectedProfessionsDraft((prev) => (prev.includes(next) ? prev : [...prev, next]));
                        setAdditionalProfessionDraft("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {selectedProfessionsDraft.filter((name) => !dbProfessionNameSet.has(name)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProfessionsDraft
                        .filter((name) => !dbProfessionNameSet.has(name))
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                            onClick={() => setSelectedProfessionsDraft((prev) => prev.filter((x) => x !== name))}
                            title="Remove custom profession"
                          >
                            {name}
                            <span className="text-muted-foreground">x</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "work" && (
              <>
                <Textarea
                  value={workPhotosDraft}
                  onChange={(e) => setWorkPhotosDraft(e.target.value)}
                  rows={7}
                  placeholder={"https://...image1.jpg\nhttps://...image2.jpg"}
                />
                <p className="text-xs text-muted-foreground">Add one image URL per line.</p>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "portfolio" && digger && (
              <PortfolioEditor
                diggerProfileId={digger.id}
                items={portfolioItems}
                onSave={handleSavePortfolio}
                onCancel={() => setSectionEditor({ open: false, section: null })}
              />
            )}
            {sectionEditor.section === "availability" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Set when you can start new projects. Giggers will see this so they know your real availability. &quot;Online now&quot; appears when you&apos;re on the site.
                </p>
                <Select value={availabilityDraft || "none"} onValueChange={(v) => setAvailabilityDraft(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="immediate">Immediate — Ready to start right away</SelectItem>
                    <SelectItem value="this_week">This week — Available within a few days</SelectItem>
                    <SelectItem value="this_month">This month — Available within the next few weeks</SelectItem>
                    <SelectItem value="not_available">Not available — Not taking new work right now</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "location" && (
              <>
                <p className="text-sm text-muted-foreground">Select your base country, state/region, and city from the database.</p>
                <LocationSelector
                  value={locationEditValue}
                  onChange={setLocationEditValue}
                  countryPlaceholder="Select country"
                  regionPlaceholder="Select state/region"
                  regionLabel="State / Region"
                  cityPlaceholder="Select city"
                  cityLabel="City"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "service_location" && (
              <>
                <p className="text-sm text-muted-foreground">Search and select countries where you offer services.</p>
                {serviceLocationDraft.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Selected ({serviceLocationDraft.length}) — click to remove</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceLocationDraft.map((countryName) => (
                        <span
                          key={countryName}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background pl-2.5 pr-1.5 py-1 text-sm"
                        >
                          <CountryFlagIcon countryNameOrCode={countryName} size="sm" />
                          <span>{countryName}</span>
                          <button
                            type="button"
                            onClick={() => setServiceLocationDraft((prev) => prev.filter((x) => x !== countryName))}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            aria-label={`Remove ${countryName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Input
                  value={serviceLocationSearchDraft}
                  onChange={(e) => setServiceLocationSearchDraft(e.target.value)}
                  placeholder="Search countries (e.g. Canada, CA)"
                />
                <div className="max-h-[300px] overflow-y-auto space-y-1.5 border rounded-md p-2">
                  {serviceLocationCountries.isLoading && <p className="text-sm text-muted-foreground px-2 py-2">Loading countries...</p>}
                  {!serviceLocationCountries.isLoading && serviceLocationCountryList.length === 0 && (
                    <p className="text-sm text-muted-foreground px-2 py-2">No countries found. Try a different search.</p>
                  )}
                  {!serviceLocationCountries.isLoading && serviceLocationCountryList.map((c) => {
                    const checked = serviceLocationDraft.includes(c.name);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setServiceLocationDraft((prev) => (checked ? prev.filter((x) => x !== c.name) : [...prev, c.name]))}
                          className="rounded"
                        />
                        <CountryFlagIcon countryNameOrCode={c.code_alpha2} size="sm" />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "website" && (
              <>
                <p className="text-sm text-muted-foreground">Your business or personal website URL.</p>
                <Input
                  type="url"
                  value={websiteDraft}
                  onChange={(e) => setWebsiteDraft(e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "social" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Let Giggers find and connect with you. Add your profile links—they’ll appear on your Digger profile with the platform’s icon. Sign-in with each platform when available, or add your profile link manually. Connect GitHub from the GitHub row on your profile.
                </p>
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {socialPlatforms.filter((p) => p.key !== "github").map((platform) => {
                    const useOAuth = SOCIAL_OAUTH_PROVIDERS.includes(platform.key as (typeof SOCIAL_OAUTH_PROVIDERS)[number]);
                    const isLinking = socialLinkingPlatform === platform.key;
                    return (
                      <div
                        key={platform.key}
                        className="rounded-xl border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-background ring-2 ring-border overflow-hidden">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(platform.domain)}&sz=32`}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{platform.label}</span>
                        </div>
                        {useOAuth && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 text-sm"
                            onClick={() => handleConnectWithSocial(platform.key)}
                            disabled={isLinking || isSectionSaving}
                          >
                            {isLinking ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Redirecting…
                              </>
                            ) : (
                              <>Connect with {platform.label}</>
                            )}
                          </Button>
                        )}
                        <div className="space-y-1">
                          <label htmlFor={`social-${platform.key}`} className="text-xs font-medium text-muted-foreground">
                            {useOAuth ? "Or add link manually" : "Profile URL"}
                          </label>
                          <Input
                            id={`social-${platform.key}`}
                            type="url"
                            value={socialLinksDraft[platform.key] || ""}
                            onChange={(e) =>
                              setSocialLinksDraft((prev) => ({
                                ...prev,
                                [platform.key]: e.target.value,
                              }))
                            }
                            placeholder={platform.placeholder}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSectionEditor({ open: false, section: null })}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "references" && digger && (
              <>
                <p className="text-sm text-muted-foreground">
                  Add references from past Giggers or clients to build trust. Use &quot;Send verification&quot; to email the reference—they click the link to verify. References from completed gigs on DigsandGigs show as &quot;Verified on DigsandGigs.&quot;
                </p>
                <div className="space-y-3 min-w-0 overflow-hidden">
                  {references.map((ref) => (
                    <div key={ref.id} className="flex items-start justify-between gap-2 p-4 rounded-lg border bg-accent/20 hover:bg-accent/30 transition-colors overflow-hidden min-w-0">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <p className="font-semibold text-foreground truncate">{ref.reference_name}</p>
                          {ref.verification_tier === "platform" ? (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
                              <ShieldCheck className="h-3 w-3 mr-0.5" />
                              Verified on DigsandGigs
                            </Badge>
                          ) : ref.verification_tier === "email" || ref.is_verified ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                              Email verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">Pending</Badge>
                          )}
                        </div>
                        {ref.project_description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-all">{ref.project_description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                        {ref.verification_tier !== "platform" && !ref.is_verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            disabled={verificationRequestLoading === ref.id || !ref.reference_email?.trim()}
                            onClick={() => sendVerificationRequest(ref.id)}
                            title={ref.reference_email ? "Send verification email to this reference" : "Add email first to send verification"}
                          >
                            {verificationRequestLoading === ref.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                            Send verification
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setRefForm({
                              mode: "edit",
                              id: ref.id,
                              reference_name: ref.reference_name,
                              reference_email: ref.reference_email ?? "",
                              reference_phone: ref.reference_phone || "",
                              project_description: ref.project_description || "",
                            })
                          }
                          aria-label="Edit reference"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteReference(ref.id)}
                          aria-label="Remove reference"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {refForm.mode && (
                  <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{refForm.mode === "add" ? "Add reference" : "Edit reference"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name *</label>
                        <Input
                          value={refForm.reference_name}
                          onChange={(e) => setRefForm((f) => ({ ...f, reference_name: e.target.value }))}
                          placeholder="Reference contact name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                          type="email"
                          value={refForm.reference_email}
                          onChange={(e) => setRefForm((f) => ({ ...f, reference_email: e.target.value }))}
                          placeholder="reference@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone (optional)</label>
                        <Input
                          value={refForm.reference_phone}
                          onChange={(e) => setRefForm((f) => ({ ...f, reference_phone: e.target.value }))}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project / role description (optional)</label>
                        <Textarea
                          value={refForm.project_description}
                          onChange={(e) => setRefForm((f) => ({ ...f, project_description: e.target.value }))}
                          placeholder="Brief description of the project or how they worked with you"
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveReference} disabled={refFormSaving}>
                          {refFormSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : refForm.mode === "add" ? (
                            "Add reference"
                          ) : (
                            "Save changes"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setRefForm({ mode: null, reference_name: "", reference_email: "", reference_phone: "", project_description: "" })}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {refForm.mode === null && (
                  <Button variant="outline" className="w-full" onClick={() => setRefForm({ mode: "add", reference_name: "", reference_email: "", reference_phone: "", project_description: "" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add reference
                  </Button>
                )}
              </>
            )}
            {sectionEditor.section === "reviews" && (
              <p className="text-sm text-muted-foreground">
                Reviews are provided by clients and cannot be edited directly.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editorModal.open}
        onOpenChange={(open) => setEditorModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{editorModal.mode === "create" ? "Create Profile" : "Edit Profile"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <DiggerInlineProfileEditor
              mode={editorModal.mode}
              profileId={editorModal.profileId}
              onSaved={async () => {
                setEditorModal((prev) => ({ ...prev, open: false }));
                await loadData();
                await loadOwnerProfiles();
              }}
              onCancel={() => setEditorModal((prev) => ({ ...prev, open: false }))}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={githubModalOpen} onOpenChange={setGithubModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Connect GitHub
            </DialogTitle>
            <DialogDescription>
              Sign in with GitHub so we can verify your profile and connect it to Digs and Gigs. Your profile will be shown on your Digger page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Button
              className="w-full h-11 bg-[#24292f] hover:bg-[#2d333b] text-white font-medium"
              onClick={handleConnectWithGitHub}
              disabled={githubLinking || githubSaving}
            >
              {githubLinking ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Redirecting to GitHub…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Connect with GitHub
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You&apos;ll be asked to authorize Digs and Gigs on GitHub. We only use this to link your profile.
            </p>
            <details className="group rounded-md border border-border bg-muted/30">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Why isn&apos;t sign-in working?
              </summary>
              <div className="px-3 pb-3 pt-0 text-xs text-muted-foreground space-y-2">
                <p>
                  &quot;Connect with GitHub&quot; needs your site admin to turn on two things in Supabase: the <strong>GitHub provider</strong> (with a GitHub OAuth app) and <strong>manual linking</strong>. Until then you may see &quot;Manual linking is disabled&quot; or &quot;GitHub sign-in linking is not enabled.&quot;
                </p>
                <p>
                  <strong>You can still connect GitHub:</strong> use the option below to paste your GitHub profile URL (e.g. <code className="rounded bg-muted px-1">https://github.com/your-username</code>) and click Save link.
                </p>
                <p className="pt-1">
                  Admins: see <code className="rounded bg-muted px-1">docs/GITHUB_CONNECT_SETUP.md</code> for setup steps.
                </p>
              </div>
            </details>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
                <span className="bg-background px-2">Or add link manually</span>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="github-url" className="text-sm font-medium">
                GitHub profile URL
              </label>
              <Input
                id="github-url"
                type="url"
                value={githubDraft}
                onChange={(e) => setGithubDraft(e.target.value)}
                placeholder="https://github.com/your-username"
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGithubModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveGithub()}
                  disabled={githubSaving}
                >
                  {githubSaving ? "Saving..." : "Save link"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiggerDetail;