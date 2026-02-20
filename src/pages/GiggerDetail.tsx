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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCodeForCountryName, ALL_COUNTRY_OPTIONS, findCountryByNameOrCode } from "@/config/regionOptions";
import { getRegionsForCountry } from "@/config/locationData";
import { getLocalTimeForCountry, formatJoinDate, formatRealName } from "@/pages/DiggerDetail/utils";
import { ensureGiggerProfile } from "@/lib/ensureGiggerProfile";
import { ensureProfileFromAuth } from "@/lib/ensureProfileFromAuth";
import { GiggerRatingsList } from "@/components/GiggerRatingsList";

const DEFAULT_AVATAR = "/default-avatar.svg";

interface ProfileRow {
  id: string;
  full_name: string | null;
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
  const [locationCountryDraft, setLocationCountryDraft] = useState("");
  const [locationStateDraft, setLocationStateDraft] = useState("");
  const [locationCityDraft, setLocationCityDraft] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);
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
          (supabase.from("profiles") as any).select("id, full_name, avatar_url, about_me, cover_photo_url, country, timezone, email, phone, email_verified, phone_verified, payment_verified, id_verified, social_verified, handle, created_at, profile_title, state, city").eq("id", userId).maybeSingle(),
          (supabase.from("gigger_profiles" as any)).select("user_id, show_to_diggers, average_rating, total_ratings").eq("user_id", userId).maybeSingle(),
          supabase.from("digger_profiles").select("profile_image_url, country, location").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
          supabase.from("gigs").select("id, title, status, budget_min, budget_max, location, created_at, awarded_at").eq("consumer_id", userId).order("created_at", { ascending: false }),
        ]);
        return {
          profileData: profileRes.data as unknown as ProfileRow | null,
          giggerData: giggerRes.data as unknown as GiggerProfileRow | null,
          diggerData: diggerRes.data as DiggerFallbackRow | null,
          gigList: (gigsRes.data ?? []) as (GigRow & { awarded_at?: string | null })[],
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
        const synthetic: ProfileRow = {
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
        setProfile(synthetic);
        setGiggerProfile(giggerData ?? { user_id: userId, show_to_diggers: true });
        setDiggerFallback(diggerData);
        setGigs(gigList);
        const open = gigList.filter((g) => g.status === "open").length;
        const active = gigList.filter((g) => g.status === "in_progress" || ((g as { awarded_at?: string | null }).awarded_at != null && g.status !== "completed")).length;
        const completed = gigList.filter((g) => g.status === "completed").length;
        setStats({ open, active, completed, total: gigList.length });
        setLoading(false);
        return;
      }
      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const visible = isOwnerView || (giggerData?.show_to_diggers !== false);
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
    const countryName = findCountryByNameOrCode(profile?.country ?? "")?.name ?? profile?.country?.trim() ?? "";
    setLocationCountryDraft(countryName);
    setLocationStateDraft(profile?.state?.trim() ?? "");
    setLocationCityDraft(profile?.city?.trim() ?? "");
    setProfileHeaderEditOpen(true);
  };
  const normalizedDraftCountry =
    findCountryByNameOrCode(locationCountryDraft)?.name ?? locationCountryDraft.trim();
  const locationStateOptions = normalizedDraftCountry ? getRegionsForCountry(normalizedDraftCountry) : [];
  const saveProfileHeaderEdit = async () => {
    if (!userId || !profile) return;
    setSavingHeader(true);
    try {
      if (isOwner) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) await ensureProfileFromAuth(authUser);
      }
      const normalizedCountryName = findCountryByNameOrCode(locationCountryDraft)?.name;
      const countryVal = normalizedCountryName || locationCountryDraft.trim() || null;
      const stateVal = locationStateDraft.trim() || null;
      const cityVal = locationCityDraft.trim() || null;
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

  const displayName = formatRealName(profile.full_name) || "Gigger";
  const avatarUrl = (profile.avatar_url == null || String(profile.avatar_url).trim() === "") ? DEFAULT_AVATAR : (profile.avatar_url || diggerFallback?.profile_image_url || DEFAULT_AVATAR);
  const initials = displayName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const handleDisplay = profile.handle?.trim() ? `@${String(profile.handle).replace(/^@/, "")}` : "";
  const profileLocationParts = [profile.city, profile.state, profile.country].filter((s) => s?.trim()).join(", ");
  const displayLocationText = (profileLocationParts.trim() || diggerFallback?.location?.trim() || profile.country || diggerFallback?.country || "").trim() || null;
  const locationCountry = displayLocationText ? (extractCountryFromLocation(displayLocationText) || displayLocationText) : (profile.country || diggerFallback?.country || null);
  const countryCode = locationCountry ? getCodeForCountryName(locationCountry) : "";
  const localTime = formatLocalTime(profile.timezone) || (locationCountry ? (getLocalTimeForCountry(locationCountry) ?? "") : "");
  const verificationItems = [
    { label: "ID verified", isActive: profile.id_verified != null ? !!profile.id_verified : false, icon: User },
    { label: "Phone", isActive: profile.phone_verified != null ? !!profile.phone_verified : !!(profile.phone?.trim() && profile.phone !== "Not specified"), icon: Phone },
    { label: "Email", isActive: profile.email_verified != null ? !!profile.email_verified : !!profile.email, icon: Mail },
    { label: "Payment", isActive: profile.payment_verified != null ? !!profile.payment_verified : false, icon: CreditCard },
  ];
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
            <div className="space-y-2">
              <label htmlFor="gigger-location-country" className="text-sm font-medium">Country</label>
              <Select
                value={normalizedDraftCountry || "__none__"}
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  setLocationCountryDraft(next);
                  if (next !== normalizedDraftCountry) setLocationStateDraft("");
                }}
              >
                <SelectTrigger id="gigger-location-country" className="w-full"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="__none__"><span className="text-muted-foreground">No country</span></SelectItem>
                  {ALL_COUNTRY_OPTIONS.map((c) => (<SelectItem key={c.code} value={c.name}><span className="flex items-center gap-2"><span>{c.flag}</span><span>{c.name}</span></span></SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {normalizedDraftCountry && locationStateOptions.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="gigger-location-state" className="text-sm font-medium">State / Region</label>
                <Select value={locationStateDraft.trim() || "__none__"} onValueChange={(v) => setLocationStateDraft(v === "__none__" ? "" : v)}>
                  <SelectTrigger id="gigger-location-state" className="w-full"><SelectValue placeholder="Select state or region" /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__"><span className="text-muted-foreground">None</span></SelectItem>
                    {locationStateOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="gigger-location-city" className="text-sm font-medium">City</label>
              <Input id="gigger-location-city" value={locationCityDraft} onChange={(e) => setLocationCityDraft(e.target.value)} placeholder="e.g. Honolulu" className="w-full" />
            </div>
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

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 py-4 sm:py-6 md:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 sm:gap-8 lg:gap-10">
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1 min-w-0">
            <Card className="overflow-hidden border border-border/70 rounded-xl bg-card">
              <div className="relative">
                <div className="h-40 sm:h-48 md:h-56 w-full bg-gradient-to-r from-slate-200 via-violet-300 to-orange-300 dark:from-slate-800 dark:via-violet-800/70 dark:to-orange-800/70" style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <div className="absolute left-4 sm:left-6 -bottom-10 sm:-bottom-12">
                  <div className="relative">
                    <button type="button" className={isOwner ? "cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary ring-offset-2 ring-offset-background block" : "cursor-default block"} onClick={isOwner ? () => setProfilePhotoDialogOpen(true) : undefined} aria-label={isOwner ? "Change profile photo" : undefined}>
                      <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </div>
                </div>
              </div>
              <CardContent className="pt-12 sm:pt-14 pb-6 px-4 sm:px-6 bg-muted/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{displayName}</h1>
                      {handleDisplay && <span className="text-lg sm:text-xl font-semibold text-primary">{handleDisplay}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-base sm:text-lg font-medium text-foreground/90 min-w-0">{profile.profile_title?.trim() || "Client / Project owner"}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {displayLocationText && (
                        <span className="flex items-center gap-2">
                          {countryCode ? (<><img src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`} alt="" className="h-4 w-5 object-cover rounded-sm shrink-0" width={20} height={15} /><span className="uppercase font-medium text-foreground text-sm">{countryCode}</span></>) : null}
                          <span>{displayLocationText}</span>
                        </span>
                      )}
                      {localTime && (<span className="flex items-center gap-1"><span className="text-muted-foreground/70">•</span><span>{localTime} local</span></span>)}
                      {profile.created_at && (<span className="flex items-center gap-1"><span className="text-muted-foreground/70">•</span><span>Joined {formatJoinDate(profile.created_at)}</span></span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (<Button variant="outline" size="sm" onClick={openProfileHeaderEdit} className="gap-1.5"><Pencil className="h-4 w-4 mr-1.5" />Edit</Button>)}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare} title="Share profile"><Share2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {stats && (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-0.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open</span><div className="flex items-center gap-1.5"><Briefcase className="h-5 w-5 text-primary" /><span className="font-semibold text-foreground tabular-nums">{stats.open}</span></div></div>
                    <div className="flex flex-col gap-0.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</span><div className="flex items-center gap-1.5"><Briefcase className="h-5 w-5 text-amber-500" /><span className="font-semibold text-foreground tabular-nums">{stats.active}</span></div></div>
                    <div className="flex flex-col gap-0.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</span><div className="flex items-center gap-1.5"><Briefcase className="h-5 w-5 text-green-600" /><span className="font-semibold text-foreground tabular-nums">{stats.completed}</span></div></div>
                    <div className="flex flex-col gap-0.5"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span><div className="flex items-center gap-1.5"><FileText className="h-5 w-5 text-muted-foreground" /><span className="font-semibold text-foreground tabular-nums">{stats.total}</span></div></div>
                  </div>
                )}
              </CardContent>
            </Card>
            {(profile.about_me?.trim() || isOwner) && (
              <Card className="rounded-xl border border-border/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />About</CardTitle>
                  {isOwner && <Button variant="ghost" size="sm" onClick={openAboutEdit} className="gap-1.5"><Pencil className="h-4 w-4" />Edit</Button>}
                </CardHeader>
                <CardContent><p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.about_me?.trim() || "No bio yet."}</p></CardContent>
              </Card>
            )}
            <Card className="rounded-xl border border-border/70">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />Projects</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">{stats && stats.total > 0 ? `${stats.open} open, ${stats.active} active, ${stats.completed} completed.` : "No projects posted yet."}</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-border/70">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Recent projects</CardTitle></CardHeader>
              <CardContent>
                {gigs.length === 0 ? <p className="text-sm text-muted-foreground">No projects posted yet.</p> : (
                  <div className="space-y-3">
                    {gigs.slice(0, 10).map((gig) => (
                      <button type="button" key={gig.id} className="w-full rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-4" onClick={() => navigate(`/gig/${gig.id}`)}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground line-clamp-1">{gig.title || "Untitled"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                            {gig.location && <span className="line-clamp-1">{gig.location}</span>}
                            <span>{new Date(gig.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant={gig.status === "open" ? "default" : "secondary"} className="shrink-0 capitalize">{gig.status || "—"}</Badge>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {userId && (
              <GiggerRatingsList
                consumerId={userId}
                averageRating={giggerProfile?.average_rating}
                totalRatings={giggerProfile?.total_ratings}
                title="Reviews from professionals"
              />
            )}
          </div>
          <div className="lg:col-span-3 order-1 lg:order-2 min-w-0 w-full">
            <div className="space-y-4 sm:space-y-6 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              <Card className="w-full">
                <CardHeader className="py-3 px-4 sm:px-5"><CardTitle className="text-sm font-medium">Verifications</CardTitle></CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {verificationItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item.isActive ? "bg-green-500/10" : "bg-muted"}`}>
                          <item.icon className={`h-4 w-4 ${item.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-xs font-medium ${item.isActive ? "text-green-600" : "text-muted-foreground"}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full rounded-xl border border-border/70 border-primary/20 bg-primary/5 overflow-hidden">
                <CardHeader className="pb-2"><CardTitle className="text-lg">Hire this client&apos;s projects</CardTitle><CardDescription>View their open gigs and submit a proposal.</CardDescription></CardHeader>
                <CardContent><Button className="w-full" onClick={() => navigate("/browse-gigs")}>Browse open gigs<ArrowRight className="h-4 w-4 ml-2" /></Button></CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
