import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { CoverPhotoUpload } from "@/components/CoverPhotoUpload";
import { SafeProfessionSelector } from "@/components/SafeProfessionSelector";
import { WorkSamplesUpload } from "@/components/WorkSamplesUpload";
import { CertificationsInput } from "@/components/CertificationsInput";
import { BioGenerator } from "@/components/BioGenerator";
import { useProfessions } from "@/hooks/useProfessions";
import { ALL_COUNTRIES, getRegionLabel, getRegionsForCountry } from "@/config/locationData";
import { Progress } from "@/components/ui/progress";

interface DiggerInlineProfileEditorProps {
  mode: "create" | "edit";
  profileId?: string | null;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

export function DiggerInlineProfileEditor({
  mode,
  profileId,
  onSaved,
  onCancel,
}: DiggerInlineProfileEditorProps) {
  const { user } = useAuth();
  const { getProfessionById } = useProfessions();
  const [effectiveProfileId, setEffectiveProfileId] = useState<string | null>(profileId || null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [selectedProfessionIds, setSelectedProfessionIds] = useState<string[]>([]);
  const [location, setLocation] = useState("United States");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("United States");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [pricingModel, setPricingModel] = useState("commission");
  const [hourlyRateMin, setHourlyRateMin] = useState<number | null>(null);
  const [hourlyRateMax, setHourlyRateMax] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");

  const businessLocationRegions = useMemo(() => getRegionsForCountry(location), [location]);
  const serviceAreaRegions = useMemo(() => getRegionsForCountry(country), [country]);
  const skills = useMemo(
    () =>
      skillsInput
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [skillsInput]
  );
  const normalizedUsername = businessName.replace(/^@/, "").trim();
  const hasServiceArea =
    country === "All Countries" ||
    (country.trim().length > 0 && (serviceAreaRegions.length === 0 || selectedStates.length > 0));

  const completionItems = useMemo(
    () => [
      { id: "username-section", label: "Choose your username", completed: normalizedUsername.length >= 3, weight: 10, essential: true },
      { id: "profession-section", label: "Select profession(s)", completed: selectedProfessionIds.length > 0, weight: 15, essential: true },
      { id: "bio-section", label: "Write a clear bio (80+ chars)", completed: bio.trim().length >= 80, weight: 20, essential: true },
      { id: "profile-photo-section", label: "Add profile photo", completed: Boolean(photoUrl), weight: 15, essential: true },
      { id: "service-area-section", label: "Set service area", completed: hasServiceArea, weight: 10, essential: true },
      { id: "skills-section", label: "Add at least 3 skills", completed: skills.length >= 3, weight: 10, essential: false },
      { id: "pricing-section", label: "Select pricing model", completed: Boolean(pricingModel), weight: 5, essential: false },
      { id: "rates-section", label: "Set hourly range", completed: hourlyRateMin !== null && hourlyRateMax !== null, weight: 5, essential: false },
      { id: "work-samples-section", label: "Upload work sample(s)", completed: workPhotos.length > 0, weight: 5, essential: false },
      { id: "certifications-section", label: "Add certification(s)", completed: certifications.length > 0, weight: 5, essential: false },
    ],
    [
      normalizedUsername.length,
      selectedProfessionIds.length,
      bio,
      photoUrl,
      hasServiceArea,
      skills.length,
      pricingModel,
      hourlyRateMin,
      hourlyRateMax,
      workPhotos.length,
      certifications.length,
    ]
  );

  const completionScore = useMemo(() => {
    const total = completionItems.reduce((sum, item) => sum + item.weight, 0);
    const completed = completionItems
      .filter((item) => item.completed)
      .reduce((sum, item) => sum + item.weight, 0);
    return Math.round((completed / total) * 100);
  }, [completionItems]);

  const essentials = useMemo(() => completionItems.filter((item) => item.essential), [completionItems]);
  const isAlmostDone = completionScore >= 70 && completionScore < 95;
  const isComplete = completionScore >= 100;
  const essentialsCompleted = useMemo(
    () => essentials.filter((item) => item.completed).length,
    [essentials]
  );
  const nextSteps = useMemo(
    () => completionItems.filter((item) => !item.completed).slice(0, 3),
    [completionItems]
  );

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isValidPhoneNumber = (phoneNumber: string): boolean => {
    if (!phoneNumber.trim()) return true;
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const syncProfilePhoto = async (url: string) => {
    if (!user) return;
    try {
      const metadata = user.user_metadata || {};
      await supabase.auth.updateUser({ data: { ...metadata, avatar_url: url || "", picture: url || "" } });
      await supabase.from("profiles").update({ avatar_url: url || null }).eq("id", user.id);
      await supabase.from("digger_profiles").update({ profile_image_url: url || null }).eq("user_id", user.id);
    } catch (error) {
      console.warn("Failed to sync profile photo", error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      try {
        const [{ data: userProfile }, { data: allProfiles }] = await Promise.all([
          supabase.from("profiles").select("handle, full_name, phone, avatar_url").eq("id", user.id).maybeSingle(),
          supabase.from("digger_profiles").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        ]);

        let targetProfile: any = null;
        const targetProfileId = mode === "edit" ? profileId : null;
        if (targetProfileId) {
          targetProfile = allProfiles?.find((p: any) => p.id === targetProfileId) || null;
        } else if (mode === "edit") {
          targetProfile = allProfiles?.find((p: any) => p.is_primary) || allProfiles?.[0] || null;
        }

        if (!targetProfile && mode === "create") {
          const existingCount = allProfiles?.length || 0;
          const baseHandle = (userProfile as any)?.handle || (userProfile as any)?.full_name || "pro";
          const safeHandle = String(baseHandle)
            .replace(/^@/, "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "")
            .slice(0, 30) || `pro_${Date.now().toString().slice(-6)}`;

          const { data: created, error: createError } = await supabase
            .from("digger_profiles")
            .insert({
              user_id: user.id,
              business_name: safeHandle,
              company_name: safeHandle,
              handle: existingCount === 0 ? safeHandle : null,
              profile_name: existingCount === 0 ? "Main Profile" : `Profile ${existingCount + 1}`,
              is_primary: existingCount === 0,
              location: "United States",
              country: "United States",
              phone: ((userProfile as any)?.phone || "").trim(),
            } as any)
            .select("*")
            .single();
          if (createError) throw createError;
          targetProfile = created;
          setEffectiveProfileId(created.id);
          toast.success("New profile started. Finish setup and save.");
        } else {
          setEffectiveProfileId(targetProfile?.id || null);
        }

        if (!targetProfile) {
          setLoadingProfile(false);
          return;
        }

        const { data: assignments } = await supabase
          .from("digger_profession_assignments")
          .select("profession_id")
          .eq("digger_profile_id", targetProfile.id);

        const authPhoto = (user as any)?.user_metadata?.avatar_url || (user as any)?.user_metadata?.picture || "";
        setPhotoUrl(targetProfile.profile_image_url || (userProfile as any)?.avatar_url || authPhoto || "");
        setBusinessName(
          targetProfile.handle || targetProfile.business_name
            ? `@${(targetProfile.handle || targetProfile.business_name).replace(/^@/, "")}`
            : ""
        );
        setUsernameLocked(Boolean(allProfiles?.some((p: any) => p.handle)));
        setSelectedProfessionIds((assignments || []).map((a: any) => a.profession_id));
        setLocation(targetProfile.location || "United States");
        setCountry(targetProfile.country || "United States");
        setStateProvince(targetProfile.location?.includes(",") ? targetProfile.location.split(",")[0].trim() : "");
        setSelectedStates(
          targetProfile.state
            ? String(targetProfile.state)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : []
        );
        setPhone(targetProfile.phone || "");
        setBio(targetProfile.bio || "");
        setSkillsInput(((targetProfile.skills || targetProfile.keywords || []) as string[]).join(", "));
        setPricingModel(targetProfile.pricing_model || "commission");
        setHourlyRateMin(targetProfile.hourly_rate_min ?? null);
        setHourlyRateMax(targetProfile.hourly_rate_max ?? null);
        setTitle(targetProfile.custom_occupation_title || "");
        setTagline(targetProfile.tagline || "");
        setWorkPhotos(targetProfile.work_photos || []);
        setCertifications(targetProfile.certifications || []);
        setCoverPhotoUrl(targetProfile.cover_photo_url || "");
      } catch (error: any) {
        toast.error(error?.message || "Failed to load profile editor.");
      } finally {
        setLoadingProfile(false);
      }
    };
    initialize();
  }, [mode, profileId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !effectiveProfileId) return;
    if (!businessName.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      toast.error("Phone must be 10-15 digits when provided.");
      return;
    }
    setSaving(true);
    try {
      const professionNames = selectedProfessionIds
        .map((id) => getProfessionById(id))
        .filter(Boolean)
        .map((p) => p!.name);
      const professionString = professionNames.join(", ");
      const usernameClean = businessName.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const businessLocation = stateProvince ? `${stateProvince}, ${location}` : location;
      const stateValue = selectedStates.length ? selectedStates.join(", ") : null;

      if (!usernameLocked) {
        const { data: existingHandle } = await supabase
          .from("digger_profiles")
          .select("id, user_id")
          .ilike("handle", usernameClean)
          .neq("id", effectiveProfileId)
          .maybeSingle();
        if (existingHandle && existingHandle.user_id !== user.id) {
          toast.error("That username is already taken.");
          setSaving(false);
          return;
        }
      }

      const updatePayload: any = {
        profession: professionString || null,
        location: businessLocation,
        country,
        state: stateValue,
        phone: phone || null,
        bio: bio || null,
        skills: skills.length ? skills : null,
        keywords: skills.length ? skills : null,
        pricing_model: pricingModel,
        hourly_rate_min: hourlyRateMin,
        hourly_rate_max: hourlyRateMax,
        profile_image_url: photoUrl || null,
        custom_occupation_title: title || null,
        tagline: tagline || null,
        work_photos: workPhotos.length ? workPhotos : null,
        certifications: certifications.length ? certifications : null,
        cover_photo_url: coverPhotoUrl || null,
      };
      if (!usernameLocked) {
        updatePayload.handle = usernameClean;
        updatePayload.business_name = usernameClean;
        updatePayload.company_name = usernameClean;
      }

      const { error } = await supabase.from("digger_profiles").update(updatePayload).eq("id", effectiveProfileId);
      if (error) throw error;

      const { error: deleteAssignmentsError } = await supabase
        .from("digger_profession_assignments")
        .delete()
        .eq("digger_profile_id", effectiveProfileId);
      if (deleteAssignmentsError) throw deleteAssignmentsError;

      if (selectedProfessionIds.length > 0) {
        const { error: insertAssignmentsError } = await supabase.from("digger_profession_assignments").insert(
          selectedProfessionIds.map((professionId, index) => ({
            digger_profile_id: effectiveProfileId,
            profession_id: professionId,
            is_primary: index === 0,
          }))
        );
        if (insertAssignmentsError) throw insertAssignmentsError;
      }

      await syncProfilePhoto(photoUrl);
      toast.success("Profile saved.");
      await onSaved();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-primary/30">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create Digger Profile" : "Edit Digger Profile"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Quick setup: complete the essentials first, then save and publish-ready details."
            : "Manage profile essentials and publish-ready details without leaving My Profiles."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 pb-20 sm:pb-6">
          <div className="sticky top-0 z-20 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Profile completion
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep this above 80% to improve trust and client response.
                </p>
              </div>
              <Badge variant={completionScore >= 80 ? "default" : "secondary"}>{completionScore}%</Badge>
            </div>
            <Progress value={completionScore} className="mt-3 h-2.5" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Essentials {essentialsCompleted}/{essentials.length}
              </Badge>
              {nextSteps.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>

          <div id="profile-photo-section">
            <ProfilePhotoUpload
              currentPhotoUrl={photoUrl}
              onPhotoChange={(url) => {
                setPhotoUrl(url);
              }}
              companyName={businessName}
            />
          </div>
          <CoverPhotoUpload currentCoverUrl={coverPhotoUrl} onCoverChange={setCoverPhotoUrl} />
          <ProfileTitleTaglineEditor
            title={title}
            tagline={tagline}
            onTitleChange={setTitle}
            onTaglineChange={setTagline}
            companyName={businessName}
            profession={selectedProfessionIds
              .map((id) => getProfessionById(id))
              .filter(Boolean)
              .map((p) => p!.name)
              .join(", ")}
            keywords={skills}
          />

          <div id="username-section" className="space-y-2">
            <Label htmlFor="inline-business-name">Username</Label>
            <Input
              id="inline-business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="@yourname"
              disabled={usernameLocked}
            />
            {usernameLocked && <p className="text-xs text-muted-foreground">Username is locked after first setup.</p>}
          </div>

          <div id="profession-section" className="space-y-2">
            <Label>Professions</Label>
            <SafeProfessionSelector
              selectedProfessionIds={selectedProfessionIds}
              onProfessionsChange={setSelectedProfessionIds}
              maxSelections={10}
            />
          </div>

          <div id="business-location-section" className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business country</Label>
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setStateProvince("");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select country...</option>
                {ALL_COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
            {location && businessLocationRegions.length > 0 && (
              <div className="space-y-2">
                <Label>{getRegionLabel(location)}</Label>
                <select
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select {getRegionLabel(location).toLowerCase()}...</option>
                  {businessLocationRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div id="service-area-section" className="space-y-2">
            <Label>Service area country</Label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setSelectedStates([]);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select country...</option>
              <option value="All Countries">All Countries</option>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {country && country !== "All Countries" && serviceAreaRegions.length > 0 && (
            <div className="space-y-2">
              <Label>{getRegionLabel(country)} service areas</Label>
              <div className="flex flex-wrap gap-2">
                {serviceAreaRegions.map((region) => {
                  const selected = selectedStates.includes(region);
                  return (
                    <Button
                      key={region}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() =>
                        setSelectedStates((prev) =>
                          selected ? prev.filter((s) => s !== region) : [...prev, region]
                        )
                      }
                    >
                      {region}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inline-phone">Phone (optional)</Label>
            <Input
              id="inline-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()+ ]/g, ""))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div id="bio-section" className="space-y-2">
            <Label htmlFor="inline-bio">Bio</Label>
            <Textarea id="inline-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
            <BioGenerator
              profession={selectedProfessionIds
                .map((id) => getProfessionById(id))
                .filter(Boolean)
                .map((p) => p!.name)
                .join(", ")}
              currentBio={bio}
              onBioGenerated={setBio}
            />
          </div>

          <div id="skills-section" className="space-y-2">
            <Label htmlFor="inline-skills">Skills (comma-separated)</Label>
            <Textarea
              id="inline-skills"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, Plumbing, Drywall, SEO"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div id="pricing-section" className="space-y-2">
            <Label>Pricing model</Label>
            <select
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="commission">Fixed Price Contracts</option>
              <option value="hourly">Time & Materials (Hourly)</option>
              <option value="both">Both Models</option>
            </select>
          </div>

          <div id="rates-section" className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Hourly rate min</Label>
              <Input
                type="number"
                min={0}
                value={hourlyRateMin ?? ""}
                onChange={(e) => setHourlyRateMin(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly rate max</Label>
              <Input
                type="number"
                min={0}
                value={hourlyRateMax ?? ""}
                onChange={(e) => setHourlyRateMax(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <div id="work-samples-section" className="space-y-2">
            <Label>Work samples</Label>
            <WorkSamplesUpload currentPhotos={workPhotos} onPhotosChange={setWorkPhotos} maxPhotos={10} />
          </div>

          <div id="certifications-section" className="space-y-2">
            <Label>Certifications</Label>
            <CertificationsInput certifications={certifications} onCertificationsChange={setCertifications} />
          </div>

          {mode === "create" && (
            <Button
              type="button"
              className={`sm:hidden fixed bottom-4 right-4 z-40 rounded-full px-4 shadow-lg bg-gradient-primary text-primary-foreground transition-all ${
                isAlmostDone ? "animate-pulse ring-2 ring-primary/30" : ""
              } ${isComplete ? "animate-none ring-0" : ""}`}
              onClick={() => {
                if (nextSteps.length > 0) {
                  scrollToSection(nextSteps[0].id);
                  return;
                }
                scrollToSection("profile-photo-section");
              }}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {isAlmostDone ? "Almost done · " : ""}
              {completionScore}% complete
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
