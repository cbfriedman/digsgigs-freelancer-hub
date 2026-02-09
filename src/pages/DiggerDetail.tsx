import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2, CheckCircle2, AlertTriangle, Edit, Phone, Camera, Sparkles, FileText, Search, MapPin, ShieldCheck, CreditCard, Share2, User, FileCheck, Crown, Pencil, Upload, Trash2, ImagePlus } from "lucide-react";
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
import { ProfileHeader, ProfileAbout, WorkSamplesGallery, QuickContactCard, ReferencesSection } from "@/components/digger-profile";

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

/** Profile URL: /digger/username or /digger/uuid */
const getDiggerProfileUrl = (d: { id: string; handle?: string | null }) =>
  (d.handle && d.handle.trim()) ? `/digger/${d.handle.replace(/^@/, '').toLowerCase()}` : `/digger/${d.id}`;

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
  const [activeTab, setActiveTab] = useState("general");
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [coverPhotoDialogOpen, setCoverPhotoDialogOpen] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const coverPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadData();
  }, [slug]);

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

    // Replace URL with username-based when profile has handle (primary profile)
    if (diggerData.handle) {
      const cleanUrl = `/digger/${diggerData.handle.replace(/^@/, '').trim().toLowerCase()}`;
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
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: publicUrl }).eq("id", digger.id);
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
      const { error } = await supabase.from("digger_profiles").update({ cover_photo_url: null }).eq("id", digger.id);
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
        keywords={`${displayProfession}, ${digger.location}, contractor, service professional, ${digger.skills?.join(', ') || ''}`}
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

      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 md:py-8 lg:py-12">
        <div className="sticky top-14 sm:top-16 z-10 bg-background py-2 sm:py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 sm:-mt-6 md:-mt-8 lg:-mt-12 mb-3 sm:mb-4">
          <Breadcrumb 
            items={[
              { label: "Browse Diggers", href: "/browse-diggers" },
              { label: digger.business_name, href: getDiggerProfileUrl(digger) }
            ]} 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main content - Himalayas-style left column */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1 min-w-0">
            {(!isOwnProfile || viewAsClient) ? (
              <>
                {/* Hero: cover + avatar on left (reference layout) */}
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="relative">
                    <div 
                      className="h-40 sm:h-52 md:h-60 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted"
                      style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
                    {/* Avatar on left, overlapping cover */}
                    <div className="absolute left-4 sm:left-6 -bottom-12 sm:-bottom-14">
                      <div className="relative">
                        <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
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
                  {/* Profile header: name left, share/edit top right */}
                  <CardContent className="pt-16 sm:pt-20 pb-4 px-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                          {!hasViewAccess ? (digger.business_name || digger.profile_name || "").split(" ").map(w => w.charAt(0) + ".").join("") + "." : (formatDisplayName(digger.profiles?.full_name, digger.handle || digger.business_name) || digger.business_name || digger.profile_name || "Professional")}
                        </h1>
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
                        <div className="flex items-center gap-2.5 rounded-full border-2 border-primary/60 bg-primary/5 px-3 py-1.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background">
                            <Crown className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-base font-bold text-foreground">
                            {digger.completion_rate ?? 0}% Job Success
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 mt-4 border-b border-border">
                      <button type="button" onClick={() => setActiveTab("general")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "general" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        General
                      </button>
                      {(digger.digger_categories || []).slice(0, 3).map((dc, idx) => (
                        <button key={idx} type="button" onClick={() => setActiveTab(`cat-${idx}`)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === `cat-${idx}` ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                          {dc.categories?.name || ""}
                        </button>
                      ))}
                    </div>
                    {/* Metrics row */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
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
                      <p className="text-lg sm:text-xl font-bold flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                        {getDisplayProfession()}
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                      </p>
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

                {/* Bio */}
                {digger.bio && (
                  <Card>
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

                {/* Keywords */}
                {((digger.keywords?.length ?? 0) > 0 || (digger.skills?.length ?? 0) > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Keywords & skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(digger.keywords || []).map((kw, idx) => (
                          <Badge key={`kw-${idx}`} variant="default" className="px-3 py-1">
                            {kw}
                          </Badge>
                        ))}
                        {(digger.skills || []).map((skill, idx) => (
                          <Badge key={`skill-${idx}`} variant="secondary" className="px-3 py-1">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Specialty / professions */}
                {(digger.digger_categories?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Specialty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(digger.digger_categories || []).map((dc, idx) => (
                          <Badge key={`cat-${idx}`} variant="outline" className="px-3 py-1">
                            {dc.categories?.name || ""}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio */}
                {(digger.portfolio_url || (digger.portfolio_urls && digger.portfolio_urls.length > 0)) && (
                  <Card>
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

                <WorkSamplesGallery photos={digger.work_photos || []} businessName={digger.business_name} />

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
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="relative">
                  <div 
                    className="h-40 sm:h-52 md:h-60 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted"
                    style={digger.cover_photo_url ? { backgroundImage: `url(${digger.cover_photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  />
                  {/* Cover action buttons */}
                  <div className="absolute top-3 right-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" className="bg-background/90 hover:bg-background shadow" onClick={() => setCoverPhotoDialogOpen(true)}>
                      Upload cover photo
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-background/90 hover:bg-background shadow" asChild>
                      <a href={`${getDiggerProfileUrl(digger)}?as=client`} target="_blank" rel="noopener noreferrer">View as Gigger</a>
                    </Button>
                  </div>
                  {/* Avatar on left with edit + online status */}
                  <div className="absolute left-4 sm:left-6 -bottom-12 sm:-bottom-14">
                    <div className="relative">
                      <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
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
                <CardContent className="pt-16 sm:pt-20 pb-4 px-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold">
                        {formatDisplayName(digger.profiles?.full_name, digger.handle || digger.business_name) || digger.business_name || digger.profile_name || "Professional"}
                      </h1>
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
                      <div className="flex items-center gap-2.5 rounded-full border-2 border-primary/60 bg-primary/5 px-3 py-1.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background">
                          <Crown className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {digger.completion_rate ?? 0}% Job Success
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/edit-digger-profile?profileId=${digger.id}`)} className="text-muted-foreground">
                        Edit profile
                      </Button>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex flex-wrap gap-1 mt-4 border-b border-border">
                    <button type="button" onClick={() => setActiveTab("general")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "general" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      General
                    </button>
                    {(digger.digger_categories || []).slice(0, 3).map((dc, idx) => (
                      <button key={idx} type="button" onClick={() => setActiveTab(`cat-${idx}`)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === `cat-${idx}` ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        {dc.categories?.name || ""}
                      </button>
                    ))}
                    <button type="button" onClick={() => navigate(`/edit-digger-profile?profileId=${digger.id}`)} className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground flex items-center gap-1">
                      Add profile <span className="text-primary">+</span>
                    </button>
                  </div>
                  {/* Metrics row */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
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
                    <p className="text-lg sm:text-xl font-bold flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                      {getDisplayProfession()}
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                    </p>
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
              </Card>

              <Card>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                {/* Bio Section - Show for all, with edit option for owners */}
                <Separator className="my-6" />
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About My Services
                  </h2>
                  {digger.bio ? (
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{digger.bio}</p>
                  ) : isOwnProfile ? (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Add a professional bio to help Giggers learn about your services</p>
                      <Button onClick={() => navigate(`/edit-digger-profile?profileId=${digger.id}`)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Add Bio with AI Assistance
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No bio provided yet.</p>
                  )}
                </div>


                {(digger.digger_categories?.length ?? 0) > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Skills & Expertise</h2>
                      <div className="flex flex-wrap gap-2">
                        {(digger.digger_categories || []).map((dc, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                            {dc.categories?.name || ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {digger.work_photos && digger.work_photos.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Work Samples</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {digger.work_photos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                            <OptimizedImage
                              src={photo}
                              alt={`Work sample ${idx + 1} by ${digger.business_name}`}
                              width={300}
                              height={300}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {digger.portfolio_url && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Portfolio</h2>
                      <a 
                        href={digger.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        View Portfolio
                      </a>
                    </div>
                  </>
                )}

                {/* References Section */}
                <Separator className="my-6" />
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    📋 Prior Job References
                  </h2>
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
                  ) : isOwnProfile ? (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground mb-4">Add references from past Giggers to build trust</p>
                      <p className="text-sm text-muted-foreground">Reference management coming soon</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No references provided yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews for Owner */}
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Reviews & Ratings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <RatingsList 
                  diggerId={digger.id} 
                  isDigger={true}
                  diggerName={digger.business_name}
                />
              </CardContent>
            </Card>
          </>
            )}
          </div>

          {/* Sidebar - order first on mobile so actions are visible without scrolling */}
          <div className="lg:col-span-1 order-1 lg:order-2 min-w-0">
            <div className="space-y-4 sm:space-y-6 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              {/* Verification status (always visible in sidebar) */}
              <Card>
                <CardHeader className="py-3 px-4">
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
                      {getServiceLocationDisplay() && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="text-lg">{getCountryFlag(getServiceLocationCountry() || "")}</span>
                          <span>{getServiceLocationDisplay()}</span>
                        </div>
                      )}
                      {digger.portfolio_url && (
                        <a href={digger.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4 shrink-0" />
                          Portfolio
                        </a>
                      )}
                      {formatHourlyRate() && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{formatHourlyRate()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {(digger.digger_categories?.length ?? 0) > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Job categories</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {(digger.digger_categories || []).map((dc, idx) => (
                            <li key={idx}>{dc.categories?.name || ""}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {(digger.skills?.length ?? 0) > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Skills</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {(digger.skills || []).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="font-normal text-xs">{skill}</Badge>
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
    </div>
  );
};

export default DiggerDetail;