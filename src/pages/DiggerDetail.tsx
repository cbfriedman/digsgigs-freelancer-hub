import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2, CheckCircle2, AlertTriangle, Edit, Phone, Camera, Sparkles, FileText, Search, MapPin, ShieldCheck, CreditCard, Share2, User, FileCheck, Pencil, Upload, Trash2, ImagePlus, Plus } from "lucide-react";
import { RatingsList } from "@/components/RatingsList";
import { RichSnippetPreview } from "@/components/RichSnippetPreview";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer"; 
import SEOHead from "@/components/SEOHead";
import { generateLocalBusinessSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OptimizedImage } from "@/components/OptimizedImage";
import { DiggerPricingSelector } from "@/components/DiggerPricingSelector";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { ProfileClickPricingCard } from "@/components/ProfileClickPricingCard";
import { useProfileCallTracking } from "@/hooks/useProfileCallTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BioGenerator } from "@/components/BioGenerator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileHeader, ProfileAbout, QuickContactCard, ReferencesSection } from "@/components/digger-profile";
import { getCanonicalDiggerProfilePath, normalizeHandle } from "@/lib/profileUrls";
import { DiggerInlineProfileEditor } from "@/components/DiggerInlineProfileEditor";
import { ALL_COUNTRY_OPTIONS, getFlagForCountryName } from "@/config/regionOptions";
import { useProfessions } from "@/hooks/useProfessions";

interface Reference {
  id: string;
  reference_name: string;
  reference_email: string;
  reference_phone: string | null;
  project_description: string | null;
  is_verified: boolean;
}

interface ReferenceRequest {
  id: string;
  status: string;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  business_name: string;
  profession: string;
  profile_name?: string | null;
  tagline: string | null;
  availability: string | null;
  bio: string | null;
  location: string;
  city?: string | null;
  phone: string;
  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  cover_photo_url?: string | null;
  portfolio_url: string | null;
  portfolio_urls?: string[] | null;
  work_photos: string[] | null;
  skills: string[] | null;
  certifications?: string[] | null;
  keywords?: string[] | null;
  completion_rate: number | null;
  response_time_hours: number | null;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  sic_code: string[] | null;
  naics_code: string[] | null;
  custom_occupation_title: string | null;
  primary_profession_index: number | null;
  location_lat: number | null;
  location_lng: number | null;
  pricing_model: string | null;
  subscription_tier: string | null;
  offers_free_estimates: boolean | null;
  country: string | null;
  website_url?: string | null;
  service_countries?: string[] | null;
  monthly_salary?: number | null;
  social_links?: any;
  state?: string | null;
  verified?: boolean | null;
  stripe_connect_onboarded?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  created_at?: string | null;
  digger_categories: {
    categories: {
      name: string;
      description: string | null;
    };
  }[];
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Format: "Hongqiang C. @jackson325" or just "@jackson325" if no real name */
const formatDisplayName = (fullName: string | null | undefined, handle: string | null | undefined): string => {
  const parts: string[] = [];
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(/\s+/);
    const first = names[0];
    const lastInitial = names.length > 1 ? names[names.length - 1].charAt(0) + '.' : '';
    parts.push(`${first} ${lastInitial}`.trim());
  }
  if (handle && handle.trim()) {
    parts.push(`@${handle.replace(/^@/, '')}`);
  }
  return parts.join(' ') || '';
};

/** Canonical profile URL: /profile/:handle/digger with legacy fallback */
const getDiggerProfileUrl = (d: { id: string; handle?: string | null }) =>
  getCanonicalDiggerProfilePath({ handle: d.handle, diggerId: d.id }) || `/digger/${d.id}`;

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
};

const formatJoinDate = (createdAt: string | null | undefined): string => {
  if (!createdAt) return "";
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
};

const DiggerDetail = () => {
  const navigate = useNavigate();
  const { id: slug } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const viewAsClient = searchParams.get("as") === "client";
  const [digger, setDigger] = useState<Digger | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [referenceRequests, setReferenceRequests] = useState<Record<string, ReferenceRequest>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasViewAccess, setHasViewAccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null);
  const { isOnline } = useDiggerPresence(digger?.id ?? '');
  const { recordCall, isRecording: isCallingDigger } = useProfileCallTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  
  // People also viewed (related diggers)
  const [relatedDiggers, setRelatedDiggers] = useState<{ id: string; handle: string | null; business_name: string; profession: string | null; profile_image_url: string | null; custom_occupation_title: string | null }[]>([]);
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [coverPhotoDialogOpen, setCoverPhotoDialogOpen] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const coverPhotoInputRef = useRef<HTMLInputElement | null>(null);
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
  const { professions } = useProfessions();
  const [sectionEditor, setSectionEditor] = useState<{
    open: boolean;
    section: "about" | "skills" | "work" | "portfolio" | "availability" | "location" | "service_location" | "website" | "salary" | "social" | "references" | "reviews" | null;
  }>({ open: false, section: null });
  const [aboutDraft, setAboutDraft] = useState("");
  const [availabilityDraft, setAvailabilityDraft] = useState<string>("");
  const [locationDraft, setLocationDraft] = useState("");
  const [serviceLocationDraft, setServiceLocationDraft] = useState<string[]>([]);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [salaryDraft, setSalaryDraft] = useState<string>("");
  const [socialLinksDraft, setSocialLinksDraft] = useState<Record<string, string>>({});
  const [selectedSkillsDraft, setSelectedSkillsDraft] = useState<string[]>([]);
  const [workPhotosDraft, setWorkPhotosDraft] = useState("");
  const [portfolioDraft, setPortfolioDraft] = useState("");
  const [isSectionSaving, setIsSectionSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadOwnerProfiles = useCallback(async () => {
    if (!currentUser || !isOwnProfile) return;
    const { data } = await supabase
      .from("digger_profiles")
      .select("id, handle, profile_name, business_name, is_primary")
      .eq("user_id", currentUser.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setOwnerProfiles((data as any[]) || []);
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
      setEditorModal({ open: true, mode: "create", profileId: null });
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

  // Fetch related diggers for "People also viewed" when viewing another's profile
  useEffect(() => {
    if (!slug || !digger || isOwnProfile) return;
    const loadRelated = async () => {
      const profession = digger.profession || '';
      const categoryIds = (digger.digger_categories || []).map((dc: { categories?: { name: string } }) => dc.categories?.name).filter(Boolean);
      const { data } = await supabase
        .from("digger_profiles")
        .select("id, handle, business_name, profession, profile_image_url, custom_occupation_title")
        .neq("id", digger.id)
        .limit(8);
      if (data?.length) setRelatedDiggers(data);
    };
    loadRelated();
  }, [slug, digger, isOwnProfile]);

  const loadData = async () => {
    if (!slug) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    // Check if user is a digger trying to view another digger's profile
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();
      
      // If user is a digger, check if they're viewing their own profile
      if (profile?.user_type === "digger") {
        const fetchBySlug = isUuid(slug)
          ? supabase.from("digger_profiles").select("user_id").eq("id", slug)
          : supabase.from("digger_profiles").select("user_id").eq("handle", slug.toLowerCase());
        const { data: diggerProfile } = await fetchBySlug.maybeSingle();
        
        // Block if digger is trying to view another digger's profile
        if (diggerProfile && diggerProfile.user_id !== session.user.id) {
          toast.error("Diggers cannot view other Diggers' profiles. The marketplace is currently closed and curated.");
          navigate("/");
          return;
        }
      }
    }

    // Fetch digger by UUID or username (handle)
    const fetchQuery = isUuid(slug)
      ? supabase.from("digger_profiles").select(`*, profiles!digger_profiles_user_id_fkey (full_name, email, avatar_url), digger_categories (categories (name, description))`).eq("id", slug)
      : supabase.from("digger_profiles").select(`*, profiles!digger_profiles_user_id_fkey (full_name, email, avatar_url), digger_categories (categories (name, description))`).eq("handle", slug.toLowerCase());
    const { data: diggerData, error: diggerError } = await fetchQuery.single();

    if (diggerError || !diggerData) {
      toast.error("Digger not found");
      navigate("/");
      return;
    }

    const profileId = diggerData.id;
    setDigger(diggerData);
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
        console.error('Failed to record click:', error);
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
          console.error('Error checking profile view access:', profileViewError);
        }
        setHasViewAccess(!!profileView);
      } catch (error) {
        // Silently fail - view access check shouldn't block page load
        console.error('Failed to check profile view access:', error);
        setHasViewAccess(false);
      }
    }

    const { data: referencesData } = await supabase
      .from("references")
      .select("*")
      .eq("digger_id", profileId);

    setReferences(referencesData || []);
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
        requestsData.forEach((req: any) => {
          requestsMap[req.reference_id] = { id: req.id, status: req.status };
        });
        setReferenceRequests(requestsMap);
      }
    }

  };

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

  const openCreateModal = () => {
    setEditorModal({
      open: true,
      mode: "create",
      profileId: null,
    });
  };

  const openSectionModal = (section: "about" | "skills" | "work" | "portfolio" | "availability" | "location" | "service_location" | "website" | "salary" | "social" | "references" | "reviews") => {
    if (!digger) return;
    if (section === "about") setAboutDraft(digger.bio || "");
    if (section === "availability") setAvailabilityDraft(digger.availability || "");
    if (section === "location") setLocationDraft(digger.country || "");
    if (section === "service_location") setServiceLocationDraft((digger.service_countries?.length ?? 0) > 0 ? digger.service_countries! : (digger.country ? [digger.country] : []));
    if (section === "website") setWebsiteDraft(digger.website_url || "");
    if (section === "salary") setSalaryDraft(digger.monthly_salary != null ? String(digger.monthly_salary) : digger.hourly_rate != null ? String(digger.hourly_rate) : "");
    if (section === "social") setSocialLinksDraft((digger.social_links || {}) as Record<string, string>);
    if (section === "skills") {
      setSelectedSkillsDraft(removeBlockedSkills(digger.skills || digger.keywords || []));
    }
    if (section === "work") setWorkPhotosDraft((digger.work_photos || []).join("\n"));
    if (section === "portfolio") setPortfolioDraft(digger.portfolio_url || "");
    setSectionEditor({ open: true, section });
  };

  const getAvailabilityLabel = (value: string | null) => {
    if (!value) return "Not specified";
    const labels: Record<string, string> = { immediate: "Immediate", this_week: "This week", this_month: "This month" };
    return labels[value] || value;
  };

  const removeBlockedSkills = (skills: string[]): string[] =>
    skills.filter((skill) => skill.trim().toLowerCase() !== "reactsf");

  const professionNameSet = useMemo(() => new Set(professions.map((p) => p.name)), [professions]);

  const normalizeSkills = (skills: string[]): string[] => {
    const deduped = Array.from(new Set(removeBlockedSkills(skills.map((s) => s.trim()).filter(Boolean))));
    if (professionNameSet.size === 0) return deduped;
    // Keep only real database skills when taxonomy is available.
    return deduped.filter((skill) => professionNameSet.has(skill));
  };

  const socialPlatforms: { key: string; label: string; placeholder: string }[] = [
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/your-name" },
    { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/your-handle" },
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/your-handle" },
    { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-page" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@your-channel" },
    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@your-handle" },
  ];

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
        const nextSkills = normalizeSkills(selectedSkillsDraft);
        await supabase
          .from("digger_profiles")
          .update({ skills: nextSkills.length ? nextSkills : null, keywords: nextSkills.length ? nextSkills : null })
          .eq("id", digger.id);
      } else if (sectionEditor.section === "work") {
        const nextPhotos = parseLineList(workPhotosDraft);
        await supabase.from("digger_profiles").update({ work_photos: nextPhotos.length ? nextPhotos : null }).eq("id", digger.id);
      } else if (sectionEditor.section === "portfolio") {
        await supabase.from("digger_profiles").update({ portfolio_url: portfolioDraft.trim() || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "availability") {
        const val = availabilityDraft.trim() || null;
        await supabase.from("digger_profiles").update({ availability: val }).eq("id", digger.id);
      } else if (sectionEditor.section === "location") {
        await supabase.from("digger_profiles").update({ country: locationDraft.trim() || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "service_location") {
        await supabase.from("digger_profiles").update({ service_countries: serviceLocationDraft.length ? serviceLocationDraft : null }).eq("id", digger.id);
      } else if (sectionEditor.section === "website") {
        await supabase.from("digger_profiles").update({ website_url: websiteDraft.trim() || null }).eq("id", digger.id);
      } else if (sectionEditor.section === "salary") {
        const num = salaryDraft.trim() ? parseFloat(salaryDraft) : null;
        await supabase.from("digger_profiles").update({ monthly_salary: num != null && !isNaN(num) ? num : null }).eq("id", digger.id);
      } else if (sectionEditor.section === "social") {
        const nextLinks = sanitizeSocialLinks(socialLinksDraft);
        await supabase.from("digger_profiles").update({ social_links: Object.keys(nextLinks).length ? nextLinks : null }).eq("id", digger.id);
      }

      if (["about", "skills", "work", "portfolio", "availability", "location", "service_location", "website", "salary", "social"].includes(sectionEditor.section)) {
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

  const handleSetPrimaryProfile = async (profileId: string) => {
    if (!currentUser) return;
    try {
      const { data: allProfiles } = await supabase
        .from("digger_profiles")
        .select("handle, business_name")
        .eq("user_id", currentUser.id);
      const username =
        allProfiles?.find((p: any) => p.handle || p.business_name)?.handle ||
        allProfiles?.find((p: any) => p.business_name)?.business_name ||
        null;

      await supabase.from("digger_profiles").update({ is_primary: false, handle: null } as any).eq("user_id", currentUser.id);
      await supabase.from("digger_profiles").update({ is_primary: true, handle: username } as any).eq("id", profileId);
      toast.success("Primary profile updated");
      await loadOwnerProfiles();
      await loadData();
    } catch {
      toast.error("Failed to set primary profile");
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!currentUser) return;
    const confirmed = window.confirm("Delete this profile permanently?");
    if (!confirmed) return;
    try {
      await supabase.from("digger_profiles").delete().eq("id", profileId).eq("user_id", currentUser.id);
      toast.success("Profile deleted");
      await loadOwnerProfiles();
      if (digger?.id === profileId) {
        const { data: fallback } = await supabase
          .from("digger_profiles")
          .select("id, handle")
          .eq("user_id", currentUser.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (fallback?.id) {
          navigate(getCanonicalDiggerProfilePath({ handle: (fallback as any).handle, diggerId: fallback.id }) || `/digger/${fallback.id}`);
        } else {
          navigate("/role-dashboard");
        }
      } else {
        await loadData();
      }
    } catch {
      toast.error("Failed to delete profile");
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
    if (profileErr) console.warn("Failed to sync profiles.avatar_url:", profileErr);
    if (currentUser?.id === userId) {
      try {
        const existingMetadata = currentUser.user_metadata || {};
        await supabase.auth.updateUser({ data: { ...existingMetadata, avatar_url: authValue, picture: authValue } });
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.user) setCurrentUser(session.user);
      } catch (e) {
        console.warn("Failed to sync auth user_metadata:", e);
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
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload photo");
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
    } catch (err: any) {
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
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: publicUrl } as any).eq("id", digger.id);
      if (error) throw error;
      setDigger((d) => (d ? { ...d, cover_photo_url: publicUrl } : null));
      setCoverPhotoDialogOpen(false);
      toast.success("Cover photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload cover photo");
    } finally {
      setCoverPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverPhotoRemove = async () => {
    if (!digger) return;
    try {
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: null } as any).eq("id", digger.id);
      if (error) throw error;
      setDigger((d) => (d ? { ...d, cover_photo_url: null } : null));
      setCoverPhotoDialogOpen(false);
      toast.success("Cover photo removed");
    } catch (err: any) {
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
    } catch (error: any) {
      toast.error("Error starting conversation: " + error.message);
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
    } catch (error: any) {
      if (error.code === '23505') {
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
            console.warn('Facebook Pixel: Error tracking ContactRevealed event', error);
          }
        }
        
        // Reload data to refresh view access
        await loadData();
      } else if (data.url) {
        // Redirect to Stripe checkout (legacy flow - shouldn't happen with new subscription model)
        window.open(data.url, '_blank');
        toast.info(`Total charge: $${data.totalCharge} ($${data.viewFee} view fee + $${data.leadCost} lead cost)`);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error unlocking contact:", error);
      }
      const msg = error?.message ?? "";
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

  const getCountryFlag = (countryName: string): string => {
    const flags: { [key: string]: string } = {
      "US": "🇺🇸", "United States": "🇺🇸",
      "CA": "🇨🇦", "Canada": "🇨🇦",
      "GB": "🇬🇧", "UK": "🇬🇧", "United Kingdom": "🇬🇧",
      "AU": "🇦🇺", "Australia": "🇦🇺",
      "DE": "🇩🇪", "Germany": "🇩🇪",
      "FR": "🇫🇷", "France": "🇫🇷",
      "ES": "🇪🇸", "Spain": "🇪🇸",
      "IT": "🇮🇹", "Italy": "🇮🇹",
      "MX": "🇲🇽", "Mexico": "🇲🇽",
      "BR": "🇧🇷", "Brazil": "🇧🇷",
      "IN": "🇮🇳", "India": "🇮🇳",
      "CN": "🇨🇳", "China": "🇨🇳",
      "JP": "🇯🇵", "Japan": "🇯🇵",
      "KR": "🇰🇷", "South Korea": "🇰🇷",
      "NL": "🇳🇱", "Netherlands": "🇳🇱",
      "SE": "🇸🇪", "Sweden": "🇸🇪",
      "NO": "🇳🇴", "Norway": "🇳🇴",
      "DK": "🇩🇰", "Denmark": "🇩🇰",
      "FI": "🇫🇮", "Finland": "🇫🇮",
      "PL": "🇵🇱", "Poland": "🇵🇱",
      "IE": "🇮🇪", "Ireland": "🇮🇪",
      "CH": "🇨🇭", "Switzerland": "🇨🇭",
      "AT": "🇦🇹", "Austria": "🇦🇹",
      "BE": "🇧🇪", "Belgium": "🇧🇪",
      "PT": "🇵🇹", "Portugal": "🇵🇹",
      "GR": "🇬🇷", "Greece": "🇬🇷",
      "NZ": "🇳🇿", "New Zealand": "🇳🇿",
      "SG": "🇸🇬", "Singapore": "🇸🇬",
      "ZA": "🇿🇦", "South Africa": "🇿🇦",
      "AR": "🇦🇷", "Argentina": "🇦🇷",
      "CL": "🇨🇱", "Chile": "🇨🇱",
      "CO": "🇨🇴", "Colombia": "🇨🇴",
      "PE": "🇵🇪", "Peru": "🇵🇪",
      "IL": "🇮🇱", "Israel": "🇮🇱",
      "AE": "🇦🇪", "UAE": "🇦🇪",
      "SA": "🇸🇦", "Saudi Arabia": "🇸🇦",
      "TR": "🇹🇷", "Turkey": "🇹🇷",
      "TH": "🇹🇭", "Thailand": "🇹🇭",
      "VN": "🇻🇳", "Vietnam": "🇻🇳",
      "PH": "🇵🇭", "Philippines": "🇵🇭",
      "ID": "🇮🇩", "Indonesia": "🇮🇩",
      "MY": "🇲🇾", "Malaysia": "🇲🇾",
      "EG": "🇪🇬", "Egypt": "🇪🇬",
      "NG": "🇳🇬", "Nigeria": "🇳🇬",
      "KE": "🇰🇪", "Kenya": "🇰🇪",
      "Other": "🌍"
    };
    const key = (countryName || "").trim();
    if (!key) return "🌍";
    return flags[key] || flags[key.toUpperCase()] || flags[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] || "🌍";
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
  const verificationItems = [
    { label: "ID verified", isActive: !!digger.verified, icon: User },
    { label: "Phone", isActive: !!digger.phone && digger.phone !== "Not specified", icon: Phone },
    { label: "Email", isActive: !!digger.profiles?.email, icon: Mail },
    { label: "Payment", isActive: !!(digger.stripe_connect_onboarded || digger.stripe_connect_charges_enabled), icon: CreditCard },
  ];

  // Effective avatar: profile photo first, then profiles.avatar_url, then auth metadata for own profile
  const effectiveAvatarUrl = digger.profile_image_url
    || digger.profiles?.avatar_url
    || (isOwnProfile ? (currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture) : null)
    || undefined;
  const profileTitle = `${digger.profile_name || "Main Profile"}${digger.handle ? `@${String(digger.handle).replace(/^@/, "")}` : ""}`;

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
      <SEOHead
        title={`${digger.business_name} - ${displayProfession} in ${digger.location}`}
        description={`${digger.bio || `Professional ${displayProfession} services in ${digger.location}`}. ${digger.average_rating ? `Rated ${digger.average_rating}/5 stars` : 'Available for hire'}. ${digger.hourly_rate ? `Starting at $${digger.hourly_rate}/hour` : 'Contact for pricing'}.`}
        keywords={`${displayProfession}, ${digger.location}, contractor, service professional, ${(digger.skills || digger.keywords || []).join(', ')}`}
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

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 py-4 sm:py-6 md:py-8 lg:py-12">
        <div className="sticky top-14 sm:top-16 z-10 bg-background py-2 sm:py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 sm:-mt-6 md:-mt-8 lg:-mt-12 mb-3 sm:mb-4">
          <Breadcrumb 
            items={[
              { label: "Browse Diggers", href: "/browse-diggers" },
              { label: digger.business_name, href: getDiggerProfileUrl(digger) }
            ]} 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 sm:gap-8 lg:gap-10">
          {/* Main content - Himalayas-style left column */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1 min-w-0">
            {(!isOwnProfile || viewAsClient) ? (
              <>
                {/* Hero: clean Himalayas-style header */}
                <Card className="overflow-hidden border border-border/70 rounded-xl bg-card">
                  <div className="relative">
                    <div 
                      className="h-40 sm:h-48 md:h-56 w-full bg-gradient-to-r from-slate-200 via-violet-300 to-orange-300 dark:from-slate-800 dark:via-violet-800/70 dark:to-orange-800/70"
                      style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
                    <div className="absolute left-4 sm:left-6 -bottom-10 sm:-bottom-12">
                      <div className="relative">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow">
                          <AvatarImage src={effectiveAvatarUrl} alt={digger.business_name} />
                          <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                            {(digger.business_name || digger.profile_name || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online = green, Offline = grey (from useDiggerPresence / Realtime) */}
                        <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-background ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400 dark:bg-gray-500"}`} title={isOnline ? "Online" : "Offline"} />
                      </div>
                    </div>
                  </div>
                  <CardContent className="pt-12 sm:pt-14 pb-6 px-4 sm:px-6 bg-muted/20">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{profileTitle}</h1>
                        <p className="mt-1 text-sm sm:text-base font-medium text-muted-foreground">
                          {displayProfession || digger.custom_occupation_title || "Professional"}
                          {(digger.handle || digger.business_name) ? (
                            <span className="ml-2">@{String(digger.handle || digger.business_name).replace(/^@/, "")}</span>
                          ) : null}
                        </p>
                        {digger.tagline && <p className="mt-2 text-sm sm:text-base text-foreground/90">{digger.tagline}</p>}
                        {(getServiceLocationDisplay() || digger.created_at) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                            {getServiceLocationDisplay() && (
                              <span className="flex items-center gap-1.5">
                                <span className="text-base">{getCountryFlag(getServiceLocationCountry() || "")}</span>
                                {getServiceLocationDisplay()}
                              </span>
                            )}
                            {digger.created_at && (
                              <span>Joined on {formatJoinDate(digger.created_at)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOwnProfile && viewAsClient && (
                          <Button variant="outline" size="sm" onClick={() => openEditModal(digger.id)}>
                            <Pencil className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Metrics row */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{digger.average_rating?.toFixed(1) || "New"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-5 w-5 text-orange-500" />
                        <span>{digger.total_ratings || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span>{formatCurrency(totalEarnings)}</span>
                      </div>
                      {digger.completion_rate != null && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="font-medium">{digger.completion_rate}%</span>
                        </div>
                      )}
                    </div>
                    {/* Professional title + hourly rate */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {formatHourlyRate() && (
                        <span className="text-sm sm:text-base font-semibold text-muted-foreground">
                          {formatHourlyRate()}
                        </span>
                      )}
                    </div>
                    {/* Recommendations */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-muted-foreground text-sm">
                      {references.length > 0 && <span>• {references.length} Recommendation{references.length !== 1 ? "s" : ""}</span>}
                    </div>
                  </CardContent>
                </Card>

                {digger.bio && (
                  <Card className="rounded-xl border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{digger.bio}</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-xl border-border/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {digger.years_experience != null
                        ? `${digger.years_experience}+ years of professional experience`
                        : "Professional experience details not added yet."}
                    </div>
                    {references.length > 0 && (
                      <div className="space-y-2">
                        {references.slice(0, 3).map((ref) => (
                          <div key={ref.id} className="rounded-md border p-3">
                            <p className="font-medium text-sm">{ref.reference_name}</p>
                            {ref.project_description && (
                              <p className="text-xs text-muted-foreground mt-1">{ref.project_description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl border-border/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Education</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(digger.certifications?.length || 0) > 0 ? (
                      <ul className="space-y-2">
                        {(digger.certifications || []).slice(0, 6).map((cert, idx) => (
                          <li key={`${cert}-${idx}`} className="text-sm text-muted-foreground">
                            {cert}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No education or certification details added yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Portfolio */}
                {(digger.portfolio_url || (digger.portfolio_urls && digger.portfolio_urls.length > 0)) && (
                  <Card className="rounded-xl border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Portfolio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                )}

                {/* Work history / references */}
                <ReferencesSection references={references} />

                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Star className="h-5 w-5 text-primary shrink-0" />
                      Reviews & ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <RatingsList diggerId={digger.id} isDigger={false} diggerName={digger.business_name} />
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Owner View - Same reference layout with management actions */
              <>
              <section className="overflow-hidden border-b border-border bg-card">
                <div className="relative">
                  <div 
                    className="h-40 sm:h-48 md:h-56 w-full bg-gradient-to-r from-slate-200 via-violet-300 to-orange-300 dark:from-slate-800 dark:via-violet-800/70 dark:to-orange-800/70"
                    style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  />
                  <div className="absolute left-4 sm:left-6 -bottom-10 sm:-bottom-12">
                    <div className="relative">
                      <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow">
                        <AvatarImage src={effectiveAvatarUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                          {getInitials(digger.handle || digger.business_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Button size="sm" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0 shadow-md border-2 border-background" onClick={() => setProfilePhotoDialogOpen(true)} title="Edit profile photo">
                        <Camera className="h-4 w-4" />
                      </Button>
                      {/* Online = green, Offline = grey (from useDiggerPresence / Realtime) */}
                      <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-background ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400 dark:bg-gray-500"}`} title={isOnline ? "Online" : "Offline"} />
                    </div>
                  </div>
                </div>
                <CardContent className="pt-12 sm:pt-14 pb-6 px-4 sm:px-6 bg-muted/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{profileTitle}</h1>
                      <p className="mt-1 text-sm sm:text-base font-medium text-muted-foreground">
                        {displayProfession || digger.custom_occupation_title || "Professional"}
                        {(digger.handle || digger.business_name) ? (
                          <span className="ml-2">@{String(digger.handle || digger.business_name).replace(/^@/, "")}</span>
                        ) : null}
                      </p>
                      {digger.tagline && <p className="mt-2 text-sm sm:text-base text-foreground/90">{digger.tagline}</p>}
                      {(getServiceLocationDisplay() || digger.created_at) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                          {getServiceLocationDisplay() && (
                            <span className="flex items-center gap-1.5">
                              <span className="text-base">{getCountryFlag(getServiceLocationCountry() || "")}</span>
                              {getServiceLocationDisplay()}
                            </span>
                          )}
                          {digger.created_at && (
                            <span>Joined on {formatJoinDate(digger.created_at)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(digger.id)} className="text-muted-foreground">
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Metrics row */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{digger.average_rating?.toFixed(1) || "New"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-5 w-5 text-orange-500" />
                      <span>{digger.total_ratings || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span>{formatCurrency(totalEarnings)}</span>
                    </div>
                    {digger.completion_rate != null && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium">{digger.completion_rate}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {formatHourlyRate() && (
                      <span className="text-sm sm:text-base font-semibold text-muted-foreground">
                        {formatHourlyRate()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-muted-foreground text-sm">
                    {references.length > 0 && <span>• {references.length} Recommendation{references.length !== 1 ? "s" : ""}</span>}
                  </div>
                </CardContent>
              </section>

              <section className="py-6 border-b border-border">
                <div className="pb-2 flex flex-row items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => openSectionModal("about")} title="Edit About">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  {digger.bio ? (
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{digger.bio}</p>
                  ) : (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Add a professional bio to help Giggers learn about your services</p>
                      <Button onClick={() => openSectionModal("about")}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Add Bio with AI Assistance
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              <section className="py-6 border-b border-border">
                <div className="pb-2 flex flex-row items-center justify-between">
                  <h2 className="text-lg font-semibold">Portfolio</h2>
                  <Button variant="ghost" size="icon" onClick={() => openSectionModal("portfolio")} title="Edit Portfolio">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  {digger.portfolio_url ? (
                    <a
                      href={digger.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      View Portfolio
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No portfolio link added yet.</p>
                  )}
                </div>
              </section>

              <section className="py-6 border-b border-border">
                <div className="pb-2 flex flex-row items-center justify-between">
                  <h2 className="text-lg font-semibold">Prior Job References</h2>
                  <Button variant="ghost" size="icon" onClick={() => openSectionModal("references")} title="Edit References">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  {references.length > 0 ? (
                    <div className="space-y-3">
                      {references.map((ref) => (
                        <div key={ref.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{ref.reference_name}</p>
                              {ref.project_description && (
                                <p className="text-sm text-muted-foreground mt-1">{ref.project_description}</p>
                              )}
                            </div>
                            {ref.is_verified && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground mb-4">Add references from past Giggers to build trust</p>
                      <p className="text-sm text-muted-foreground">Reference management coming soon</p>
                    </div>
                  )}
                </div>
              </section>

            {/* Reviews for Owner */}
            <section className="py-6">
              <div className="pb-3 flex flex-row items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Reviews & Ratings</h2>
                <Button variant="ghost" size="icon" onClick={() => openSectionModal("reviews")} title="About Reviews">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <RatingsList 
                  diggerId={digger.id} 
                  isDigger={true}
                  diggerName={digger.business_name}
                />
              </div>
            </section>
          </>
            )}
          </div>

          {/* Sidebar - 30% width on desktop */}
          <div className="lg:col-span-3 order-1 lg:order-2 min-w-0 w-full">
            <div className="space-y-4 sm:space-y-6 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              <Card className="w-full">
                  <CardHeader className="py-3 px-4 sm:px-5">
                    <CardTitle className="text-sm font-medium">Verifications</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                      {verificationItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${item.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                            <item.icon className={`h-4 w-4 ${item.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-xs font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              <Card className="rounded-xl border-border/70 w-full">
                <CardHeader className="py-3 px-4 sm:px-5">
                  <CardTitle className="text-sm font-medium">Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-4 sm:px-5 pb-4 space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Availability</p>
                      {isOwnProfile && (
                        <button type="button" onClick={() => openSectionModal("availability")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm text-left ${isOwnProfile ? "hover:border-primary/50 hover:bg-muted/50 cursor-pointer" : "cursor-default"}`}
                      onClick={() => isOwnProfile && openSectionModal("availability")}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                      {isOnline ? "Open to opportunities" : getAvailabilityLabel(digger.availability)}
                    </button>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Location</p>
                      {isOwnProfile && (digger.country || getServiceLocationDisplay()) && (
                        <button type="button" onClick={() => openSectionModal("location")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {(digger.country || getServiceLocationDisplay()) ? (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm text-left ${isOwnProfile ? "hover:border-primary/50 hover:bg-muted/50 cursor-pointer" : "cursor-default"}`}
                        onClick={() => isOwnProfile && openSectionModal("location")}
                      >
                        <span className="text-base">{getFlagForCountryName(digger.country || getServiceLocationCountry() || "") || getCountryFlag(digger.country || getServiceLocationCountry() || "")}</span>
                        {digger.country || getServiceLocationDisplay() || "Not specified"}
                      </button>
                    ) : (
                      <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("location")}>
                        <Plus className="h-4 w-4 shrink-0" /> Add location
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Service location</p>
                      {isOwnProfile && ((digger.service_countries?.length ?? 0) > 0 || (digger.country && (!digger.service_countries || digger.service_countries.length === 0))) && (
                        <button type="button" onClick={() => openSectionModal("service_location")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {((digger.service_countries?.length ?? 0) > 0 || (digger.country && (!digger.service_countries || digger.service_countries.length === 0))) ? (
                      <button
                        type="button"
                        className={`flex flex-wrap gap-1.5 ${isOwnProfile ? "cursor-pointer" : "cursor-default"}`}
                        onClick={() => isOwnProfile && openSectionModal("service_location")}
                      >
                        {((digger.service_countries?.length ?? 0) > 0 ? digger.service_countries! : [digger.country!]).map((c, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                            <span className="text-base">{getFlagForCountryName(c)}</span>
                            {c}
                          </span>
                        ))}
                      </button>
                    ) : (
                      <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("service_location")}>
                        <Plus className="h-4 w-4 shrink-0" /> Add service location
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Website</p>
                      {isOwnProfile && digger.website_url && (
                        <button type="button" onClick={() => openSectionModal("website")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {digger.website_url ? (
                      isOwnProfile ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline text-left"
                          onClick={() => openSectionModal("website")}
                        >
                          <Globe className="h-4 w-4 shrink-0" />
                          <span className="truncate">{digger.website_url}</span>
                        </button>
                      ) : (
                        <a href={digger.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4 shrink-0" />
                          <span className="truncate">{digger.website_url}</span>
                        </a>
                      )
                    ) : (
                      <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("website")}>
                        <Plus className="h-4 w-4 shrink-0" /> Add website
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Portfolio</p>
                      {isOwnProfile && digger.portfolio_url && (
                        <button type="button" onClick={() => openSectionModal("portfolio")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {digger.portfolio_url ? (
                      isOwnProfile ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline text-left"
                          onClick={() => openSectionModal("portfolio")}
                        >
                          <span className="truncate">{digger.portfolio_url}</span>
                        </button>
                      ) : (
                        <a href={digger.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                          {digger.portfolio_url}
                        </a>
                      )
                    ) : (
                      <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("portfolio")}>
                        <Plus className="h-4 w-4 shrink-0" /> Add portfolio
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Monthly salary</p>
                      {isOwnProfile && (digger.monthly_salary != null || formatHourlyRate()) && (
                        <button type="button" onClick={() => openSectionModal("salary")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {(digger.monthly_salary != null || formatHourlyRate()) ? (
                      isOwnProfile ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-sm hover:text-foreground cursor-pointer"
                          onClick={() => openSectionModal("salary")}
                        >
                          {digger.monthly_salary != null ? `$${Number(digger.monthly_salary).toLocaleString()}/mo` : formatHourlyRate()}
                        </button>
                      ) : (
                        <span className="text-sm">
                          {digger.monthly_salary != null ? `$${Number(digger.monthly_salary).toLocaleString()}/mo` : formatHourlyRate()}
                        </span>
                      )
                    ) : (
                      <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => isOwnProfile && openSectionModal("salary")}>
                        <Plus className="h-4 w-4 shrink-0" /> Add monthly salary
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Profession</p>
                      {isOwnProfile && (digger.digger_categories?.length ?? 0) > 0 && (
                        <button type="button" onClick={() => openEditModal(digger.id)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {(digger.digger_categories?.length ?? 0) > 0 ? (
                      <button
                        type="button"
                        className={`flex flex-wrap gap-1.5 text-left ${isOwnProfile ? "cursor-pointer" : "cursor-default"}`}
                        onClick={() => isOwnProfile && openEditModal(digger.id)}
                      >
                        {(digger.digger_categories || []).map((dc, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-violet-500" />
                            {dc.categories?.name || ""}
                          </span>
                        ))}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => isOwnProfile && openEditModal(digger.id)}
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Add profession
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Skills</p>
                      {isOwnProfile && normalizeSkills(digger.skills || digger.keywords || []).length > 0 && (
                        <button type="button" onClick={() => openSectionModal("skills")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {normalizeSkills(digger.skills || digger.keywords || []).length > 0 ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className={`flex flex-wrap gap-1.5 text-left ${isOwnProfile ? "cursor-pointer" : "cursor-default"}`}
                          onClick={() => isOwnProfile && openSectionModal("skills")}
                        >
                          {normalizeSkills(digger.skills || digger.keywords || []).map((skill, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                              {skill}
                            </span>
                          ))}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => isOwnProfile && openSectionModal("skills")}
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Add skills
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Social media</p>
                      {isOwnProfile && digger.social_links && Object.keys(digger.social_links).length > 0 && (
                        <button type="button" onClick={() => openSectionModal("social")} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {digger.social_links && Object.keys(digger.social_links).length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(digger.social_links)
                          .filter(([, url]) => Boolean(String(url).trim()))
                          .map(([platform, url]) => {
                            const href = String(url).trim();
                            const label = socialPlatforms.find((p) => p.key === platform)?.label || platform;
                            return (
                              <a
                                key={platform}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm text-primary hover:underline w-fit max-w-full"
                                title={href}
                              >
                                <span className="font-medium">{label}:</span>
                                <span className="truncate max-w-[220px]">{href}</span>
                              </a>
                            );
                          })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => isOwnProfile && openSectionModal("social")}
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Add social links
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
              {(!isOwnProfile || viewAsClient) && (
                <>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className={`flex items-center gap-2 text-sm font-medium ${isOnline ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400 dark:bg-gray-500"}`} title={isOnline ? "Online" : "Offline"} />
                        <span>
                          {isOnline ? "Open to opportunities" : "Currently offline"}
                        </span>
                      </div>
                      {(digger.country || getServiceLocationDisplay()) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="text-lg">{getFlagForCountryName(digger.country || "") || getCountryFlag(getServiceLocationCountry() || "")}</span>
                          <span>{digger.country || getServiceLocationDisplay()}</span>
                        </div>
                      )}
                      {digger.website_url && (
                        <a href={digger.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4 shrink-0" />
                          Website
                        </a>
                      )}
                      {digger.portfolio_url && (
                        <a href={digger.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4 shrink-0" />
                          Portfolio
                        </a>
                      )}
                      {(digger.monthly_salary != null || formatHourlyRate()) && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {digger.monthly_salary != null ? `$${Number(digger.monthly_salary).toLocaleString()}/mo` : formatHourlyRate()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                  {normalizeSkills(digger.skills || digger.keywords || []).length > 0 && (
                    <Card className="rounded-xl border-border/70">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Skills</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {normalizeSkills(digger.skills || digger.keywords || []).map((skill, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <QuickContactCard
                    hasViewAccess={hasViewAccess}
                    isUnlocking={isUnlocking}
                    isCallingDigger={isCallingDigger}
                    phone={digger.phone}
                    offersFreEstimates={digger.offers_free_estimates}
                    hourlyRateDisplay={formatHourlyRate()}
                    onSendMessage={handleSendMessage}
                    onCallDigger={handleCallDigger}
                    onUnlockContact={handleUnlockContact}
                  />

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
                  {relatedDiggers.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">People also viewed</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <ul className="space-y-3">
                          {relatedDiggers.slice(0, 6).map((d) => (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => navigate(getDiggerProfileUrl(d))}
                                className="flex items-center gap-3 w-full text-left rounded-lg p-2 -mx-2 hover:bg-accent/50 transition-colors"
                              >
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={d.profile_image_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {(d.business_name || "?").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{d.business_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {d.custom_occupation_title || d.profession || "Professional"}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate("/browse-diggers")}>
                          View all talent
                        </Button>
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
                  {!profile.is_primary && (
                    <Button size="sm" variant="outline" onClick={() => void handleSetPrimaryProfile(profile.id)}>
                      Set Primary
                    </Button>
                  )}
                  {!profile.is_primary && (
                    <Button size="sm" variant="outline" onClick={() => void handleDeleteProfile(profile.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-2 flex justify-end">
              <Button onClick={openCreateModal}>Create New Profile</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={sectionEditor.open}
        onOpenChange={(open) => setSectionEditor((prev) => (open ? prev : { open: false, section: null }))}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {sectionEditor.section === "about" && "Edit About"}
              {sectionEditor.section === "skills" && "Edit Skills"}
              {sectionEditor.section === "work" && "Edit Work Samples"}
              {sectionEditor.section === "portfolio" && "Edit Portfolio"}
              {sectionEditor.section === "availability" && "Edit Availability"}
              {sectionEditor.section === "location" && "Edit Location"}
              {sectionEditor.section === "service_location" && "Edit Service Location"}
              {sectionEditor.section === "website" && "Edit Website"}
              {sectionEditor.section === "salary" && "Edit Monthly Salary"}
              {sectionEditor.section === "social" && "Edit Social Links"}
              {sectionEditor.section === "references" && "References"}
              {sectionEditor.section === "reviews" && "Reviews"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sectionEditor.section === "about" && (
              <>
                <Textarea
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  rows={8}
                  placeholder="Describe your services and expertise..."
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "skills" && (
              <>
                <p className="text-sm text-muted-foreground">Select skills from the database. These help clients find you.</p>
                <div className="max-h-[280px] overflow-y-auto space-y-2 border rounded-md p-3">
                  {professions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading professions...</p>
                  ) : (
                    professions.map((p) => {
                      const checked = selectedSkillsDraft.includes(p.name);
                      return (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSkillsDraft((prev) =>
                                checked ? prev.filter((x) => x !== p.name) : [...prev, p.name]
                              );
                            }}
                            className="rounded"
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })
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
            {sectionEditor.section === "portfolio" && (
              <>
                <Input
                  value={portfolioDraft}
                  onChange={(e) => setPortfolioDraft(e.target.value)}
                  placeholder="https://your-portfolio.com"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "availability" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Tell clients when you can start new projects. This helps them find pros who match their timeline.
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
                <p className="text-sm text-muted-foreground">Your base location (country where you are located).</p>
                <Select value={locationDraft || "none"} onValueChange={(v) => setLocationDraft(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="z-[250] max-h-[300px]">
                    <SelectItem value="none">Not specified</SelectItem>
                    {ALL_COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "service_location" && (
              <>
                <p className="text-sm text-muted-foreground">Countries where you offer services. Clients can filter by these.</p>
                <div className="max-h-[260px] overflow-y-auto space-y-2 border rounded-md p-3">
                  {ALL_COUNTRY_OPTIONS.map((c) => {
                    const checked = serviceLocationDraft.includes(c.name);
                    return (
                      <label key={c.code} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setServiceLocationDraft((prev) => (checked ? prev.filter((x) => x !== c.name) : [...prev, c.name]))}
                          className="rounded"
                        />
                        <span className="text-base">{c.flag}</span>
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
            {sectionEditor.section === "salary" && (
              <>
                <p className="text-sm text-muted-foreground">Your expected monthly salary (in USD or your local currency).</p>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={salaryDraft}
                  onChange={(e) => setSalaryDraft(e.target.value)}
                  placeholder="e.g. 5000"
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
                <p className="text-sm text-muted-foreground">Add your social profiles so clients can learn more about your work.</p>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {socialPlatforms.map((platform) => (
                    <div key={platform.key} className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">{platform.label}</p>
                      <Input
                        type="url"
                        value={socialLinksDraft[platform.key] || ""}
                        onChange={(e) =>
                          setSocialLinksDraft((prev) => ({
                            ...prev,
                            [platform.key]: e.target.value,
                          }))
                        }
                        placeholder={platform.placeholder}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSection} disabled={isSectionSaving}>
                    {isSectionSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
            {sectionEditor.section === "references" && (
              <p className="text-sm text-muted-foreground">
                Reference editing will be available in this section soon. For now, contact support to update references.
              </p>
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
    </div>
  );
};

export default DiggerDetail;