import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Share2,
  Briefcase,
  Loader2,
  ArrowRight,
  FileText,
  Pencil,
  Upload,
  Trash2,
  ImagePlus,
  Clock,
  MapPin,
  Star,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelector, type LocationValue } from "@/components/LocationSelector";
import { resolveLocationFromText } from "@/hooks/useLocations";
import { getCodeForCountryName } from "@/config/regionOptions";
import { getLocalTimeForLocation, formatJoinDate, formatRealName } from "@/pages/DiggerDetail/utils";
import { ensureGiggerProfile } from "@/lib/ensureGiggerProfile";
import { ensureProfileFromAuth } from "@/lib/ensureProfileFromAuth";
import { GiggerRatingsList } from "@/components/GiggerRatingsList";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DEFAULT_AVATAR = "/default-avatar.svg";

interface ProfileRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  about_me: string | null;
  cover_photo_url: string | null;
  country: string | null;
  timezone: string | null;
  email: string | null;
  phone: string | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  payment_verified: boolean | null;
  id_verified: boolean | null;
  social_verified: boolean | null;
  handle: string | null;
  created_at: string | null;
  profile_title: string | null;
  state: string | null;
  city: string | null;
}

interface DiggerFallbackRow {
  profile_image_url: string | null;
  country: string | null;
  location: string | null;
}

interface GiggerProfileRow {
  user_id: string;
  show_to_diggers: boolean;
  average_rating?: number | null;
  total_ratings?: number | null;
}

interface GigRow {
  id: string;
  title: string | null;
  status: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location: string | null;
  created_at: string;
  description?: string | null;
  skills_required?: string[] | null;
  poster_country?: string | null;
  preferred_regions?: string[] | null;
  work_type?: string | null;
  timeline?: string | null;
}

function formatLocalTime(timezone: string | null): string {
  if (!timezone?.trim()) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone.trim(),
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return "";
  }
}

function extractCountryFromLocation(location: string | null): string | null {
  if (!location?.trim()) return null;
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
  if (min != null) return `From $${Math.round(min).toLocaleString()}`;
  if (max != null) return `Up to $${Math.round(max).toLocaleString()}`;
  return "Budget not listed";
}

export default function GiggerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [giggerProfile, setGiggerProfile] = useState<GiggerProfileRow | null>(null);
  const [diggerFallback, setDiggerFallback] = useState<DiggerFallbackRow | null>(null);
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [stats, setStats] = useState<{ open: number; active: number; completed: number; total: number } | null>(null);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [paidByGigId, setPaidByGigId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [notVisible, setNotVisible] = useState(false);
  const [profilePhotoDialogOpen, setProfilePhotoDialogOpen] = useState(false);
  const [coverPhotoDialogOpen, setCoverPhotoDialogOpen] = useState(false);
  const [aboutEditOpen, setAboutEditOpen] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const [profileHeaderEditOpen, setProfileHeaderEditOpen] = useState(false);
  const emptyLocationValue: LocationValue = { countryId: null, regionId: null, cityId: null, countryName: "", regionName: "", cityName: "", countryCode: "" };
  const [locationEditValue, setLocationEditValue] = useState<LocationValue>(emptyLocationValue);
  const [savingHeader, setSavingHeader] = useState(false);
  const [previewGig, setPreviewGig] = useState<GigRow | null>(null);
  const [showAllRecentProjects, setShowAllRecentProjects] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);

  const isOwner = !!userId && currentUser === userId;

  useEffect(() => {
    if (!userId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id ?? null;
      if (!cancelled) setCurrentUser(uid);
      // Owner: ensure profiles row exists (edge case where trigger didn't run), then gigger_profiles row.
      if (uid === userId && session?.session?.user) {
        await ensureProfileFromAuth(session.session.user);
        if (cancelled) return;
        await ensureGiggerProfile(userId);
        if (cancelled) return;
      }
      let profileData: ProfileRow | null = null;
      let giggerData: GiggerProfileRow | null = null;
      let diggerData: DiggerFallbackRow | null = null;
      let gigList: (GigRow & { awarded_at?: string | null })[] = [];
      const fetchAll = async () => {
        const [profileRes, giggerRes, diggerRes, gigsRes] = await Promise.all([
          (supabase.from("profiles") as any).select("id, full_name, first_name, last_name, avatar_url, about_me, cover_photo_url, country, timezone, email, phone, email_verified, phone_verified, payment_verified, id_verified, social_verified, handle, created_at, profile_title, state, city").eq("id", userId).maybeSingle(),
          (supabase.from("gigger_profiles" as any)).select("user_id, show_to_diggers, average_rating, total_ratings").eq("user_id", userId).maybeSingle(),
          supabase.from("digger_profiles").select("profile_image_url, country, location").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
          supabase.from("gigs").select("id, title, status, budget_min, budget_max, location, created_at, awarded_at, description, skills_required, poster_country, preferred_regions, work_type, timeline").eq("consumer_id", userId).order("created_at", { ascending: false }),
        ]);
        return {
          profileData: profileRes.data as unknown as ProfileRow | null,
          giggerData: giggerRes.data as unknown as GiggerProfileRow | null,
          diggerData: diggerRes.data as DiggerFallbackRow | null,
          gigList: (gigsRes.data ?? []) as unknown as (GigRow & { awarded_at?: string | null })[],
        };
      };
      const first = await fetchAll();
      profileData = first.profileData;
      giggerData = first.giggerData;
      diggerData = first.diggerData;
      gigList = first.gigList;
      // Owner but profile null: refresh session and retry once (RLS may need fresh JWT or gigger_profiles row).
      if (uid === userId && !profileData) {
        await supabase.auth.getUser();
        if (cancelled) return;
        const retry = await fetchAll();
        profileData = retry.profileData;
        giggerData = retry.giggerData;
        diggerData = retry.diggerData;
        gigList = retry.gigList;
      }
      if (cancelled) return;
      const isOwnerView = uid === userId;
      // Owner with no profile from DB: show basic page from auth so the page always opens.
      if (!profileData && isOwnerView && session?.session?.user) {
        const u = session.session.user as { user_metadata?: { full_name?: string; avatar_url?: string; picture?: string } };
        const synthetic = {
          id: userId,
          full_name: u.user_metadata?.full_name ?? null,
          avatar_url: (u.user_metadata?.avatar_url ?? u.user_metadata?.picture) ?? null,
          about_me: null,
          cover_photo_url: null,
          country: null,
          timezone: null,
          email: session.session.user.email ?? null,
          phone: null,
          email_verified: null,
          phone_verified: null,
          payment_verified: null,
          id_verified: null,
          social_verified: null,
          handle: null,
          created_at: null,
          profile_title: null,
          state: null,
          city: null,
        };
        setProfile(synthetic as any);
        setGiggerProfile(giggerData ?? { user_id: userId, show_to_diggers: true });
        setDiggerFallback(diggerData);
        setGigs(gigList);
        const open = gigList.filter((g) => g.status === "open").length;
        const active = gigList.filter((g) => g.status === "in_progress" || ((g as { awarded_at?: string | null }).awarded_at != null && g.status !== "completed")).length;
        const completed = gigList.filter((g) => g.status === "completed").length;
        setStats({ open, active, completed, total: gigList.length });
        const { data: spentTotal } = await (supabase as any).rpc("get_gigger_total_spent", { p_consumer_id: userId });
        if (!cancelled && spentTotal != null) {
          const n = Number(spentTotal);
          setTotalSpent(n > 0 ? n : null);
        }
        const { data: paidRows } = await (supabase as any).rpc("get_gigger_paid_amounts_by_gig", { p_consumer_id: userId });
        if (!cancelled && (paidRows as any[])?.length) {
          const map: Record<string, number> = {};
          (paidRows as { gig_id: string; total_amount: number }[]).forEach((row) => {
            if (row.gig_id) map[row.gig_id] = Number(row.total_amount);
          });
          setPaidByGigId(map);
        }
        setLoading(false);
        return;
      }
      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let visible = isOwnerView || (giggerData?.show_to_diggers !== false);
      if (!visible && uid) {
        const { data: myDigger } = await supabase.from("digger_profiles").select("id").eq("user_id", uid).limit(1).maybeSingle();
        if (myDigger?.id && !cancelled) {
          const { data: hiredGig } = await supabase.from("gigs").select("id").eq("consumer_id", userId).eq("awarded_digger_id", myDigger.id).limit(1).maybeSingle();
          if (hiredGig) visible = true;
        }
      }
      if (!visible) {
        setNotVisible(true);
        setLoading(false);
        return;
      }
      let finalProfileData = profileData;
      if (isOwnerView && (!profileData.avatar_url || String(profileData.avatar_url).trim() === "")) {
        const authUser = session?.session?.user as { user_metadata?: { avatar_url?: string; picture?: string } } | undefined;
        const authAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
        const urlToApply = (typeof authAvatar === "string" && authAvatar.trim() ? authAvatar.trim() : null) || (diggerData?.profile_image_url?.trim() || null);
        if (urlToApply && !cancelled) {
          const { error } = await supabase.from("profiles").update({ avatar_url: urlToApply }).eq("id", userId);
          if (!error) finalProfileData = { ...profileData, avatar_url: urlToApply };
        }
      }
      setProfile(finalProfileData);
      setGiggerProfile(giggerData);
      setDiggerFallback(diggerData);
      setGigs(gigList);
      const open = gigList.filter((g) => g.status === "open").length;
      const active = gigList.filter((g) => g.status === "in_progress" || (g.awarded_at != null && g.status !== "completed")).length;
      const completed = gigList.filter((g) => g.status === "completed").length;
      setStats({ open, active, completed, total: gigList.length });
      const { data: spentTotal } = await (supabase as any).rpc("get_gigger_total_spent", { p_consumer_id: userId });
      if (!cancelled && spentTotal != null) {
        const n = Number(spentTotal);
        setTotalSpent(n > 0 ? n : null);
      }
      const { data: paidRows } = await (supabase as any).rpc("get_gigger_paid_amounts_by_gig", { p_consumer_id: userId });
      if (!cancelled && (paidRows as any[])?.length) {
        const map: Record<string, number> = {};
        (paidRows as { gig_id: string; total_amount: number }[]).forEach((row) => {
          if (row.gig_id) map[row.gig_id] = Number(row.total_amount);
        });
        setPaidByGigId(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: profile?.full_name ? `${profile.full_name} - Gigger Profile` : "Gigger Profile", url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).then(() => {});
    }
  };

  const handleProfilePhotoReplace = () => profilePhotoInputRef.current?.click();
  const handleProfilePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId || !profile || !e.target.files?.length) return;
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      setProfilePhotoUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : null));
      setProfilePhotoDialogOpen(false);
      toast.success("Profile photo updated");
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id === userId) {
        const existing = authUser.user_metadata || {};
        await supabase.auth.updateUser({ data: { ...existing, avatar_url: publicUrl, picture: publicUrl } });
        await supabase.auth.refreshSession();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setProfilePhotoUploading(false);
      e.target.value = "";
    }
  };
  const handleProfilePhotoRemove = async () => {
    if (!userId || !profile) return;
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatar_url: null } : null));
      setProfilePhotoDialogOpen(false);
      toast.success("Profile photo removed");
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id === userId) {
          const existing = authUser.user_metadata || {};
          await supabase.auth.updateUser({ data: { ...existing, avatar_url: "", picture: "" } });
          await supabase.auth.refreshSession();
        }
      } catch (authErr) {
        console.warn("Remove photo: auth sync failed", authErr);
      }
    } catch (err) {
      console.error("Remove photo error:", err);
      toast.error("Failed to remove photo");
    }
  };

  const handleCoverPhotoReplace = () => coverPhotoInputRef.current?.click();
  const handleCoverPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId || !profile || !e.target.files?.length) return;
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      setCoverPhotoUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `cover-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      const { error } = await (supabase.from("profiles") as any).update({ cover_photo_url: publicUrl }).eq("id", userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, cover_photo_url: publicUrl } : null));
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
    if (!userId || !profile) return;
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      const { error } = await (supabase.from("profiles") as any).update({ cover_photo_url: null }).eq("id", userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, cover_photo_url: null } : null));
      setCoverPhotoDialogOpen(false);
      toast.success("Cover photo removed");
    } catch {
      toast.error("Failed to remove cover photo");
    }
  };

  const openAboutEdit = () => { setAboutDraft(profile?.about_me ?? ""); setAboutEditOpen(true); };
  const saveAbout = async () => {
    if (!userId || !profile) return;
    setSavingAbout(true);
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      const { error } = await supabase.from("profiles").update({ about_me: aboutDraft.trim() || null }).eq("id", userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, about_me: aboutDraft.trim() || null } : null));
      setAboutEditOpen(false);
      toast.success("About updated");
    } catch {
      toast.error("Failed to save about");
    } finally {
      setSavingAbout(false);
    }
  };

  const openProfileHeaderEdit = () => {
    setLocationEditValue({
      ...emptyLocationValue,
      countryName: (profile?.country ?? "").trim(),
      regionName: (profile?.state ?? "").trim(),
      cityName: (profile?.city ?? "").trim(),
    });
    setProfileHeaderEditOpen(true);
  };

  useEffect(() => {
    if (!profileHeaderEditOpen || !profile) return;
    let cancelled = false;
    resolveLocationFromText(profile.country ?? null, profile.state ?? null, profile.city ?? null).then((resolved) => {
      if (!cancelled) setLocationEditValue(resolved);
    });
    return () => { cancelled = true; };
  }, [profileHeaderEditOpen, profile?.country, profile?.state, profile?.city]);

  const saveProfileHeaderEdit = async () => {
    if (!userId || !profile) return;
    setSavingHeader(true);
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      const countryVal = locationEditValue.countryName?.trim() || null;
      const stateVal = locationEditValue.regionName?.trim() || null;
      const cityVal = locationEditValue.cityName?.trim() || null;
      const updatePayload = {
        country: countryVal,
        state: stateVal,
        city: cityVal,
      };

      const { error: fullSaveError } = await (supabase
        .from("profiles") as any)
        .update(updatePayload)
        .eq("id", userId);

      const isMissingStateCityColumn =
        fullSaveError &&
        ((fullSaveError as { code?: string }).code === "42703" ||
          /state|city/i.test((fullSaveError as { message?: string }).message ?? ""));

      if (fullSaveError && !isMissingStateCityColumn) throw fullSaveError;

      if (isMissingStateCityColumn) {
        const { error: fallbackError } = await (supabase
          .from("profiles") as any)
          .update({ country: countryVal })
          .eq("id", userId);
        if (fallbackError) throw fallbackError;
        setProfile((p) => (p ? { ...p, country: countryVal } : null));
        toast.info("Saved country. State/city will save after the latest migration is applied.");
      } else {
        setProfile((p) =>
          p ? { ...p, country: countryVal, state: stateVal, city: cityVal } : null
        );
      }
      setProfileHeaderEditOpen(false);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to save profile header:", error);
      toast.error("Failed to save profile");
    } finally {
      setSavingHeader(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-foreground">Profile not found</h1>
          <p className="text-muted-foreground mt-2">This Gigger profile does not exist.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/browse-gigs")}>Browse gigs</Button>
        </div>
        <Footer />
      </div>
    );
  }
  if (notVisible) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-foreground">Profile not available</h1>
          <p className="text-muted-foreground mt-2">This Gigger has not made their profile public.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/browse-gigs")}>Browse gigs</Button>
        </div>
        <Footer />
      </div>
    );
  }
  if (!profile) return null;

  // Prefer first_name + last_name (same as Account) so one user has one name everywhere
  const legalName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  const displayName = formatRealName(legalName || profile.full_name || undefined) || "Gigger";
  const avatarUrl = (profile.avatar_url == null || String(profile.avatar_url).trim() === "") ? DEFAULT_AVATAR : (profile.avatar_url || diggerFallback?.profile_image_url || DEFAULT_AVATAR);
  const initials = displayName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const handleDisplay = profile.handle?.trim() ? `@${String(profile.handle).replace(/^@/, "")}` : "";
  const profileLocationParts = [profile.city, profile.state, profile.country].filter((s) => s?.trim()).join(", ");
  const displayLocationText = (profileLocationParts.trim() || diggerFallback?.location?.trim() || profile.country || diggerFallback?.country || "").trim() || null;
  const locationCountry = displayLocationText ? (extractCountryFromLocation(displayLocationText) || displayLocationText) : (profile.country || diggerFallback?.country || null);
  const countryCode = locationCountry ? getCodeForCountryName(locationCountry) : "";
  const localTime = formatLocalTime(profile.timezone) || (locationCountry ? (getLocalTimeForLocation(profile.country ?? locationCountry, profile.state) ?? "") : "");
  const verificationItems = [
    { label: "ID verified", isActive: profile.id_verified != null ? !!profile.id_verified : false, icon: User },
    { label: "Phone", isActive: !!profile.phone_verified, icon: Phone },
    { label: "Email", isActive: profile.email_verified != null ? !!profile.email_verified : !!profile.email, icon: Mail },
    { label: "Payment", isActive: profile.payment_verified != null ? !!profile.payment_verified : false, icon: CreditCard },
    { label: "Social", isActive: profile.social_verified != null ? !!profile.social_verified : false, icon: Share2 },
  ];
  const hasAnyVerification = verificationItems.some((i) => i.isActive);
  const coverUrl = profile.cover_photo_url ?? null;

  return (
    <div className="min-h-screen bg-background">
      <input ref={profilePhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoFileChange} />
      <input ref={coverPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhotoFileChange} />
      <Dialog open={profilePhotoDialogOpen} onOpenChange={setProfilePhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Profile photo</DialogTitle><DialogDescription>Upload a photo for your Gigger profile.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleProfilePhotoReplace} disabled={profilePhotoUploading}><Upload className="h-4 w-4" />{profilePhotoUploading ? "Uploading…" : "Replace image"}</Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleProfilePhotoRemove}><Trash2 className="h-4 w-4" />Remove image</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={coverPhotoDialogOpen} onOpenChange={setCoverPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Cover photo</DialogTitle><DialogDescription>Upload a banner image for your profile.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleCoverPhotoReplace} disabled={coverPhotoUploading}><ImagePlus className="h-4 w-4" />{coverPhotoUploading ? "Uploading…" : "Replace cover"}</Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleCoverPhotoRemove}><Trash2 className="h-4 w-4" />Remove cover</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={aboutEditOpen} onOpenChange={setAboutEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>About</DialogTitle><DialogDescription>Tell Diggers a bit about you or your projects.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Textarea value={aboutDraft} onChange={(e) => setAboutDraft(e.target.value)} placeholder="e.g. I hire for web and mobile projects." className="min-h-[120px]" />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAboutEditOpen(false)}>Cancel</Button><Button onClick={saveAbout} disabled={savingAbout}>{savingAbout ? "Saving…" : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={profileHeaderEditOpen} onOpenChange={setProfileHeaderEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Update your location, photo, and cover.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-6 py-2">
            <LocationSelector
              value={locationEditValue}
              onChange={setLocationEditValue}
              countryPlaceholder="Select country"
              regionPlaceholder="Select state/region"
              regionLabel="State / Region"
              cityPlaceholder="Select city"
              cityLabel="City"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile photo</label>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16"><AvatarImage src={avatarUrl} alt={displayName} /><AvatarFallback className="bg-primary/20 text-primary text-xl">{initials}</AvatarFallback></Avatar>
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={handleProfilePhotoReplace} disabled={profilePhotoUploading}><Upload className="h-4 w-4 mr-1.5" />{profilePhotoUploading ? "Uploading…" : "Change photo"}</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleProfilePhotoRemove}><Trash2 className="h-4 w-4 mr-1.5" />Remove</Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover photo</label>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={handleCoverPhotoReplace} disabled={coverPhotoUploading}><ImagePlus className="h-4 w-4 mr-1.5" />{coverPhotoUploading ? "Uploading…" : "Change cover"}</Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive justify-start" onClick={handleCoverPhotoRemove}><Trash2 className="h-4 w-4 mr-1.5" />Remove cover</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setProfileHeaderEditOpen(false)}>Cancel</Button>
              <Button onClick={saveProfileHeaderEdit} disabled={savingHeader}>{savingHeader ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SEOHead title={`${displayName} - Gigger Profile`} description={profile.about_me?.slice(0, 160) || `Client profile for ${displayName}.`} ogType="profile" ogImage={avatarUrl} />

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
          <div className="lg:col-span-7 space-y-4 order-2 lg:order-1 min-w-0">
            <Card className="overflow-hidden border shadow-none bg-card">
              <div className="relative">
                <div className="h-36 sm:h-44 md:h-52 w-full bg-muted" style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <div className="absolute left-3 sm:left-4 -bottom-10 sm:-bottom-12">
                  <button type="button" className={isOwner ? "cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary ring-offset-2 ring-offset-background block" : "cursor-default block"} onClick={isOwner ? () => setProfilePhotoDialogOpen(true) : undefined} aria-label={isOwner ? "Change profile photo" : undefined}>
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 border-2 border-background">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </div>
              </div>
              <CardContent className="pt-14 sm:pt-16 pb-4 px-3 sm:px-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
                      {handleDisplay && <span className="text-sm font-medium text-muted-foreground">{handleDisplay}</span>}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-foreground/90 min-w-0">{profile.profile_title?.trim() || "Client / Project owner"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {countryCode ? (<><img src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`} alt="" className="h-3.5 w-4 object-cover rounded-sm shrink-0" width={20} height={15} /><span className="uppercase font-medium text-foreground">{countryCode}</span></>) : null}
                      <span>{displayLocationText || "Not specified"}</span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>{localTime ? `${localTime} local` : "—"}</span>
                      {profile.created_at && (<><span className="text-muted-foreground/70">·</span><span>Joined {formatJoinDate(profile.created_at)}</span></>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOwner && <Button variant="outline" size="sm" onClick={openProfileHeaderEdit} className="text-xs h-8"><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile"><Share2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary fill-primary shrink-0" />
                      <span className="text-sm font-medium tabular-nums">
                        {giggerProfile?.average_rating != null && giggerProfile.average_rating > 0 ? Number(giggerProfile.average_rating).toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Reviews</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium tabular-nums">{giggerProfile?.total_ratings ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0" title="Total paid on reviewed projects">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Spent</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium tabular-nums">{totalSpent != null ? `$${Math.round(totalSpent).toLocaleString()}` : "—"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {(profile.about_me?.trim() || isOwner) && (
              <Card className="border shadow-none">
                <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">About</CardTitle>
                  {isOwner && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={openAboutEdit}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3"><p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.about_me?.trim() || "No bio yet."}</p></CardContent>
              </Card>
            )}
            <Card className="border shadow-none">
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm font-medium text-muted-foreground">Recent projects</CardTitle></CardHeader>
              <CardContent className="pt-0 px-3 pb-3">
                {gigs.length === 0 ? <p className="text-xs text-muted-foreground">No projects posted yet.</p> : (
                  <div className="space-y-2">
                    {gigs.slice(0, showAllRecentProjects ? gigs.length : 5).map((gig) => {
                      const descTrim = gig.description?.trim() ?? "";
                      const descPreview = descTrim.length > 200 ? `${descTrim.slice(0, 200)}…` : descTrim;
                      return (
                      <button type="button" key={gig.id} className={`w-full rounded-md border border-border/60 p-3 text-left transition-colors ${isOwner ? "hover:bg-muted/30 flex items-start justify-between gap-3" : "bg-muted/10 hover:bg-muted/20"}`} onClick={() => setPreviewGig(gig)}>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="font-medium text-sm text-foreground line-clamp-1">{gig.title || "Untitled"}</p>
                          {descPreview && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">{descPreview}</p>}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(gig.skills_required && gig.skills_required.length > 0) ? gig.skills_required.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="text-[10px] font-normal px-1 py-0">{s}</Badge>) : null}
                          </div>
                          {paidByGigId[gig.id] != null && paidByGigId[gig.id] > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1">Paid: ${Number(paidByGigId[gig.id]).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          )}
                        </div>
                        {isOwner && <Badge variant={gig.status === "open" ? "default" : "secondary"} className="shrink-0 capitalize text-[10px]">{gig.status || "—"}</Badge>}
                      </button>
                    ); })}
                    {gigs.length > 5 && (
                      <div className="pt-0.5">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => setShowAllRecentProjects((v) => !v)}>
                          {showAllRecentProjects ? "Show less" : `+${gigs.length - 5} more`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {userId && (
              <GiggerRatingsList
                consumerId={userId}
                averageRating={giggerProfile?.average_rating}
                totalRatings={giggerProfile?.total_ratings}
                title="Reviews from freelancers"
              />
            )}
          </div>
          <div className="lg:col-span-3 order-1 lg:order-2 min-w-0 w-full">
            <div className="space-y-3 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              {stats && (
                <Card className="w-full border shadow-none">
                  <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />Projects</CardTitle></CardHeader>
                  <CardContent className="pt-0 px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0"><span className="text-[10px] text-muted-foreground uppercase">Open</span><span className="text-sm font-medium tabular-nums">{stats.open}</span></div>
                      <div className="flex flex-col gap-0"><span className="text-[10px] text-muted-foreground uppercase">Active</span><span className="text-sm font-medium tabular-nums">{stats.active}</span></div>
                      <div className="flex flex-col gap-0"><span className="text-[10px] text-muted-foreground uppercase">Completed</span><span className="text-sm font-medium tabular-nums">{stats.completed}</span></div>
                      <div className="flex flex-col gap-0"><span className="text-[10px] text-muted-foreground uppercase">Total</span><span className="text-sm font-medium tabular-nums">{stats.total}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="w-full border shadow-none">
                <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-medium text-muted-foreground">Verification</CardTitle></CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {hasAnyVerification ? (
                    <div className="grid grid-cols-2 gap-2">
                      {verificationItems.map((item) => {
                        const openParam = isOwner && (item.label === "ID verified" ? "id" : item.label === "Phone" ? "phone" : item.label === "Email" ? "email" : item.label === "Payment" ? "payment" : item.label === "Social" ? "identity" : null);
                        const content = (
                          <>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                              <item.icon className={`h-3 w-3 ${item.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                            </div>
                            <span className={`text-[10px] font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>{item.label}</span>
                          </>
                        );
                        if (openParam) {
                          return (
                            <button
                              key={item.label}
                              type="button"
                              className="flex items-center gap-1.5 w-full text-left rounded-md py-0.5 -mx-0.5 px-0.5 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              onClick={() => navigate(`/account?open=${openParam}`)}
                            >
                              {content}
                            </button>
                          );
                        }
                        return (
                          <div key={item.label} className="flex items-center gap-1.5">
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not specified</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={!!previewGig} onOpenChange={(open) => !open && setPreviewGig(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {previewGig && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left pr-8">{previewGig.title || "Untitled"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-left">
                {previewGig.status?.trim() && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project status</span>
                    <Badge variant={previewGig.status === "open" ? "default" : "secondary"} className="capitalize shrink-0">
                      {previewGig.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )}
                {previewGig.description?.trim() && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{previewGig.description.trim()}</p>
                  </div>
                )}
                {(previewGig.skills_required && previewGig.skills_required.length > 0) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Required skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewGig.skills_required.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {previewGig.poster_country?.trim() && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{previewGig.poster_country.trim()}</span>
                    </div>
                  )}
                  {(previewGig.preferred_regions && previewGig.preferred_regions.length > 0) && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Preferred location</span>
                      <span className="font-medium text-right">{previewGig.preferred_regions.join(", ")}</span>
                    </div>
                  )}
                  {previewGig.location?.trim() && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{previewGig.location.trim()}</span>
                    </div>
                  )}
                  {previewGig.work_type?.trim() && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Job type</span>
                      <span className="font-medium capitalize">{previewGig.work_type.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {previewGig.timeline?.trim() && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Contract period</span>
                      <span className="font-medium">{previewGig.timeline.trim()}</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="pt-4">
                    <Button className="w-full gap-2" onClick={() => { navigate(`/gig/${previewGig.id}`); setPreviewGig(null); }}>
                      View full detail <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
