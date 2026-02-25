import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIDescriptionTextarea } from "@/components/AIDescriptionTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2, Lightbulb, DollarSign, Clock, User, Mail, Phone, Sparkles, Shield, Zap, MessageSquare, Globe, UserCircle, X, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { HighRiskWarningDialog } from "@/components/HighRiskWarningDialog";
import { CATEGORY_IDS, checkHighRiskKeywords, TECH_CATEGORIES } from "@/config/techCategories";
import { PROBLEM_OPTIONS, TIMELINE_OPTIONS, getProblemById, getInternalMapping, isCustomProblem } from "@/config/giggerProblems";
import { formatSelectionDisplay } from "@/config/regionOptions";
import { normalizeSkillInput, isSkillDuplicate } from "@/config/suggestedSkillsForGigs";
import {
  GIGGER_CONTACT_METHODS,
  type ContactItem,
  serializeContactPreferences,
} from "@/config/giggerContactMethods";
import { useSkillsByCategory } from "@/hooks/useSkills";
import PageLayout from "@/components/layout/PageLayout";
import { getLeadPriceDollars } from "@/lib/leadPrice";
import PostGigProgressDots from "@/components/PostGigProgressDots";
import { RegionCountrySelector } from "@/components/RegionCountrySelector";


const PostGig = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isQuickPost = searchParams.get("quick") === "1";
  const { trackEvent, isConfigured } = useFacebookPixel();
  const { user, userRoles, activeRole, switchRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Show friendly alert when user is in digger mode or doesn't have gigger role
  const showGiggerOnlyAlert = user && (activeRole === "digger" || !userRoles.includes("gigger"));
  const hasGiggerRole = userRoles.includes("gigger");
  
  // Form fields - Problem-based approach
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [posterCountry, setPosterCountry] = useState("");
  /** Account contact (name, email, phone) from profile – used for authenticated giggers so they don't re-enter */
  const [accountContact, setAccountContact] = useState<{ full_name: string | null; email: string | null; phone: string | null } | null>(null);
  /** Additional contact methods (WhatsApp, Telegram, Teams, etc.) – multi-select with value per method */
  const [contactItems, setContactItems] = useState<ContactItem[]>([]);
  const [contactAddType, setContactAddType] = useState<string>("");
  const [contactAddValue, setContactAddValue] = useState("");
  const [customProjectLabel, setCustomProjectLabel] = useState("");
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [workType, setWorkType] = useState<"remote" | "hybrid" | "onsite" | "flexible">("remote");
  const [projectType, setProjectType] = useState<"fixed" | "hourly">("fixed");
  const [hourlyRateMin, setHourlyRateMin] = useState("");
  const [hourlyRateMax, setHourlyRateMax] = useState("");
  const [estimatedHoursMin, setEstimatedHoursMin] = useState("");
  const [estimatedHoursMax, setEstimatedHoursMax] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const { skillsByCategory, allSkills } = useSkillsByCategory();

  // Load gigger's profile: country (for poster_country) and contact (name, email, phone) so we use account data instead of asking again
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase
        .from("profiles") as any)
        .select("country, full_name, email, phone")
        .eq("id", user.id)
        .single();
      if (data?.country?.trim()) setPosterCountry(data.country.trim());
      if (data) {
        setAccountContact({
          full_name: (data as any).full_name?.trim() || null,
          email: (data as any).email?.trim() || user?.email?.trim() || null,
          phone: (data as any).phone?.trim() || null,
        });
      }
    })();
  }, [user?.id, user?.email]);

  // High-risk warning state
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);


  // Get current problem option for clarifying question
  const selectedProblem = getProblemById(selectedProblemId);


  // Calculate current step for progress indicator
  const getCurrentStep = () => {
    if (!selectedProblemId) return 1;
    if (clarifyingAnswers.length === 0) return 1;
    if (!description.trim()) return 2;
    const budgetOrHourlyOk = projectType === "fixed"
      ? !!(budgetMin && budgetMax)
      : !!(hourlyRateMin.trim() || hourlyRateMax.trim());
    if (!budgetOrHourlyOk || !timeline) return 3;
    return 4;
  };

  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    const number = parseInt(numericValue);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US');
  };

  const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
  };

  const parseNum = (s: string): number => (s.trim() ? parseFloat(s.replace(/,/g, "")) : 0) || 0;

  const calculateLeadPrice = (): number => {
    if (projectType === "hourly") {
      const rMin = parseNum(hourlyRateMin);
      const rMax = parseNum(hourlyRateMax) || rMin;
      const hMin = parseNum(estimatedHoursMin) || 1;
      const hMax = parseNum(estimatedHoursMax) || hMin;
      const avgRate = (rMin + (rMax || rMin)) / 2;
      const avgHours = (hMin + (hMax || hMin)) / 2;
      const est = avgRate * Math.max(avgHours, 1);
      return getLeadPriceDollars(Math.round(est * 0.8), Math.round(est * 1.2), null);
    }
    const min = parseCurrency(budgetMin);
    const max = parseCurrency(budgetMax);
    return getLeadPriceDollars(min, max, null);
  };

  const validateForm = (): boolean => {
    if (!selectedProblemId) {
      toast.error("Please select what you're trying to do");
      return false;
    }
    if (clarifyingAnswers.length === 0) {
      toast.error("Please select at least one option for the follow-up question");
      return false;
    }
    if (!description.trim()) {
      toast.error("Please describe what you want done");
      return false;
    }
    if (projectType === "fixed") {
      if (!budgetMin.trim() || !budgetMax.trim()) {
        toast.error("Please enter your budget range (min and max)");
        return false;
      }
    } else {
      if (!hourlyRateMin.trim() && !hourlyRateMax.trim()) {
        toast.error("Please enter at least an hourly rate (min or max $/hr)");
        return false;
      }
    }
    if (!timeline) {
      toast.error("Please select a timeline");
      return false;
    }
    // When authenticated we use account contact; no need to re-enter name/email
    if (!user?.id) {
      if (!clientName.trim()) {
        toast.error("Please enter your name");
        return false;
      }
      if (!clientEmail.trim()) {
        toast.error("Please enter your email address");
        return false;
      }
    } else {
      const hasEmail = accountContact?.email?.trim() || user?.email;
      if (!hasEmail) {
        toast.error("Your account has no email. Please add one in your profile or account settings.");
        return false;
      }
    }
    return true;
  };

  const handleSubmitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    if (!validateForm()) return;

    const textToCheck = description;
    const riskCheck = checkHighRiskKeywords(textToCheck);
    
    if (riskCheck.hasRisk) {
      setMatchedKeywords(riskCheck.matchedKeywords);
      setShowWarningDialog(true);
    } else {
      await submitGig();
    }
  };

  const handleProblemChange = (value: string) => {
    setSelectedProblemId(value);
    setClarifyingAnswers([]);
    if (!isCustomProblem(value)) setCustomProjectLabel("");
  };

  const addSkill = (skill: string) => {
    const normalized = normalizeSkillInput(skill);
    if (!normalized || isSkillDuplicate(normalized, skillsRequired)) return;
    setSkillsRequired((prev) => [...prev, normalized].sort((a, b) => a.localeCompare(b)));
  };

  const removeSkill = (index: number) => {
    setSkillsRequired((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSkillInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const q = skillInput.trim().toLowerCase();
      const firstMatch = allSkills.find(
        (s) => !skillsRequired.some((x) => x.toLowerCase() === s.name.toLowerCase()) && (!q || s.name.toLowerCase().includes(q))
      );
      if (firstMatch && (e.key === "Enter" && skillInput.trim())) {
        addSkill(firstMatch.name);
      } else if (normalizeSkillInput(skillInput)) {
        addSkill(skillInput);
      }
      setSkillInput("");
      setSkillDropdownOpen(false);
    }
  };

  const handleClarifyingToggle = (value: string, checked: boolean) => {
    setClarifyingAnswers(prev => {
      const alreadySelected = prev.includes(value);
      if (checked && !alreadySelected) {
        return [...prev, value];
      } else if (!checked && alreadySelected) {
        return prev.filter(v => v !== value);
      }
      return prev;
    });
  };

  const submitGig = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const finalProblemId = selectedProblemId;
      const finalDescription = description;
      const finalBudgetMin = parseCurrency(budgetMin);
      const finalBudgetMax = parseCurrency(budgetMax);
      const finalTimeline = timeline;
      const finalClarifyingAnswers = clarifyingAnswers;
      // Use account contact for authenticated giggers so they don't re-enter name/email/phone
      const finalClientName = user?.id && accountContact
        ? (accountContact.full_name || user.email?.split("@")[0] || "Client").trim()
        : clientName.trim();
      const finalClientEmail = user?.id
        ? (accountContact?.email || user.email || "").trim()
        : clientEmail.trim();
      const finalClientPhone = user?.id
        ? (accountContact?.phone || null) || (clientPhone.trim() || null)
        : (clientPhone.trim() || null);

      const consumerId = user?.id ?? null;

      const mapping = getInternalMapping(finalProblemId);
      const category = TECH_CATEGORIES.find(c => c.id === mapping?.categoryId);
      const categoryNameForGig = category
        ? {
            [CATEGORY_IDS.SOFTWARE_WEB]: "Web Development",
            [CATEGORY_IDS.DESIGN_CREATIVE]: "Graphic Design",
            [CATEGORY_IDS.MARKETING_GROWTH]: "Digital Marketing",
            [CATEGORY_IDS.CONTENT_MEDIA]: "Content Writing",
          }[category.id] ?? category.name
        : null;

      let categoryId: string | null = null;
      if (categoryNameForGig) {
        try {
          const { data: categoryRow, error: categoryLookupError } = await supabase
            .from("categories")
            .select("id")
            .eq("name", categoryNameForGig)
            .maybeSingle();

          if (!categoryLookupError && categoryRow?.id) {
            categoryId = categoryRow.id;
          } else if (categoryLookupError) {
            console.warn("Category lookup failed, continuing without category_id:", categoryLookupError);
          }
        } catch (lookupException) {
          console.warn("Category lookup exception, continuing without category_id:", lookupException);
        }
      }
      
      const problem = getProblemById(finalProblemId);
      const clarifyingLabels = finalClarifyingAnswers
        .map(answer => problem?.clarifyingOptions.find(o => o.value === answer)?.label)
        .filter(Boolean)
        .join(', ');
      const customLabel = (customProjectLabel || '').trim();
      const title = isCustomProblem(finalProblemId)
        ? (customLabel || problem?.label || 'Custom project')
        : `${problem?.label || 'Project'}${clarifyingLabels ? ` - ${clarifyingLabels}` : ''}`.trim();

      const contactPreferencesJson = serializeContactPreferences(contactItems);

      // Use edge function so the gig is stored (bypasses RLS) and we get the row back for anon or any user
      const isHourly = projectType === "hourly";
      const body: Record<string, unknown> = {
        title,
        description: finalDescription.trim(),
        requirements: `Problem: ${problem?.label}\nDetails: ${clarifyingLabels || (customLabel || 'Not specified')}\n${customLabel ? `Custom label: ${customLabel}\n` : ''}Category: ${category?.name || "Not specified"}`,
        timeline: TIMELINE_OPTIONS.find(t => t.value === finalTimeline)?.label || finalTimeline,
        work_type: workType,
        client_name: finalClientName.trim(),
        consumer_email: finalClientEmail.trim(),
        consumer_phone: finalClientPhone.trim() || null,
        poster_country: posterCountry.trim() || null,
        category_id: categoryId,
        preferred_regions: preferredRegions.length > 0 ? preferredRegions : null,
        skills_required: skillsRequired.length > 0 ? skillsRequired : null,
        consumer_id: consumerId,
        contact_preferences: contactPreferencesJson,
        project_type: projectType,
      };
      if (isHourly) {
        body.hourly_rate_min = hourlyRateMin.trim() ? parseNum(hourlyRateMin) : null;
        body.hourly_rate_max = hourlyRateMax.trim() ? parseNum(hourlyRateMax) : null;
        body.estimated_hours_min = estimatedHoursMin.trim() ? parseNum(estimatedHoursMin) : null;
        body.estimated_hours_max = estimatedHoursMax.trim() ? parseNum(estimatedHoursMax) : null;
        body.budget_min = null;
        body.budget_max = null;
      } else {
        body.budget_min = finalBudgetMin;
        body.budget_max = finalBudgetMax;
      }

      const response = await invokeEdgeFunction<{ data: { id: string; [key: string]: unknown } }>(supabase, "post-gig", {
        body,
      });

      const gigData = response?.data;
      if (!gigData?.id) throw new Error("Failed to create project");

      // Sync skills to gig_skills junction table
      if (skillsRequired.length > 0) {
        const { data: skillRows } = await (supabase.from("skills" as any)).select("id").in("name", skillsRequired);
        if (skillRows?.length) {
          await (supabase.from("gig_skills" as any)).insert(
            (skillRows as any[]).map((r: any) => ({ gig_id: gigData.id, skill_id: r.id }))
          );
        }
      }

      // Send management email with edit/cancel links (no confirmation required)
      supabase.functions.invoke("send-gig-management-email", {
        body: { gigId: gigData.id }
      }).catch(err => console.error("Management email error:", err));

      // Send to diggers according to admin settings (manual / all / selected)
      supabase.functions.invoke("send-gig-email-by-settings", {
        body: { gigId: gigData.id },
      }).catch((err) => console.error("Gig email by settings error:", err));

      const projectLink = `${window.location.origin}/gig/${gigData.id}`;
      supabase.functions.invoke("send-consumer-onboarding-email", {
        body: {
          email: finalClientEmail.trim(),
          firstName: finalClientName.trim().split(' ')[0] || 'there',
          step: 1,
          projectLink: projectLink,
          projectName: title,
        },
      }).catch(err => {
        console.warn("Failed to send consumer onboarding email (non-critical):", err);
      });

      if (isConfigured) {
        trackEvent('Lead', { content_name: 'Gig Posted', content_ids: [gigData.id] });
      }

      toast.success("Your project is live! Check your email for management links.");
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
    } catch (error: any) {
      console.error("Error posting gig:", error);
      const msg = error?.message ?? "";
      if (msg.includes("Only giggers") || msg.includes("gigger")) {
        toast.error("Post gigs with your Gigger account", {
          description: "Switch to Gigger mode above, or sign up as a Gigger to post.",
        });
      } else {
        toast.error(msg || "Failed to post project. Please try again.");
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const submitQuickGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    if (!user?.id) {
      toast.error("Sign in to post a gig.");
      return;
    }
    if (!quickTitle.trim()) {
      toast.error("Enter a project title.");
      return;
    }
    if (!description.trim()) {
      toast.error("Describe what you need.");
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      const finalClientName = (accountContact?.full_name || user.email?.split("@")[0] || "Client").trim();
      const finalClientEmail = (accountContact?.email || user.email || "").trim();
      const finalClientPhone = accountContact?.phone?.trim() || null;
      const timelineLabel = timeline
        ? (TIMELINE_OPTIONS.find((t) => t.value === timeline)?.label || timeline)
        : "Flexible";

      const response = await invokeEdgeFunction<{ data: { id: string; [key: string]: unknown } }>(supabase, "post-gig", {
        body: {
          title: quickTitle.trim(),
          description: description.trim(),
          requirements: "Quick post",
          budget_min: parseCurrency(budgetMin) || 0,
          budget_max: parseCurrency(budgetMax) || 0,
          timeline: timelineLabel,
          work_type: "remote",
          client_name: finalClientName,
          consumer_email: finalClientEmail,
          consumer_phone: finalClientPhone,
          poster_country: posterCountry.trim() || null,
          category_id: null,
        },
      });

      const gigData = response?.data;
      if (!gigData?.id) throw new Error("Failed to create project");

      supabase.functions.invoke("send-gig-management-email", { body: { gigId: gigData.id } }).catch((err) => console.error("Management email error:", err));
      supabase.functions.invoke("send-gig-email-by-settings", { body: { gigId: gigData.id } }).catch((err) => console.error("Gig email by settings error:", err));

      toast.success("Your project is live! Diggers can bid now.");
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to post. Try again.";
      if (String(msg).includes("Only giggers") || String(msg).includes("gigger")) {
        toast.error("Post gigs with your Gigger account", { description: "Switch to Gigger mode above." });
      } else {
        toast.error(msg);
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const leadPrice = calculateLeadPrice();

  // Quick post: minimal form (title, description, optional budget/timeline) for fast posting in Gigger mode
  if (isQuickPost) {
    return (
      <PageLayout maxWidth="tight" navProps={{ showBackButton: true, backLabel: "Back" }}>
        <SEOHead title="Quick post a gig — Digs & Gigs" description="Post a gig in seconds. Get bids from Diggers." />
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in-up">
          {showGiggerOnlyAlert && (
            <div role="alert" className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <UserCircle className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Post gigs with your Gigger account</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You're in Digger mode. Switch to Gigger to post a gig and get bids.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {hasGiggerRole ? (
                      <Button type="button" onClick={() => switchRole("gigger")} className="rounded-xl bg-primary text-primary-foreground">
                        Switch to Gigger
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => navigate("/register?type=gigger")} className="rounded-xl border-primary/30 text-primary">
                        Get a Gigger account
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              Quick post
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Post a gig in seconds</h1>
            <p className="text-muted-foreground">
              Add a title and description. You can add more details on the gig page after it’s live.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={submitQuickGig} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-title">Project title *</Label>
                  <Input
                    id="quick-title"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="e.g. Website redesign, Logo design"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-desc">What do you need? *</Label>
                  <Textarea
                    id="quick-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the project so Diggers can bid accurately."
                    rows={4}
                    className="resize-none w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-budget-min">Budget min ($)</Label>
                    <Input
                      id="quick-budget-min"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-budget-max">Budget max ($)</Label>
                    <Input
                      id="quick-budget-max"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Select value={timeline || "flexible"} onValueChange={(v) => setTimeline(v === "flexible" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Flexible" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flexible</SelectItem>
                      {TIMELINE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Posting…</> : "Post gig"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/post-gig" className="text-primary hover:underline">Add more details (category, skills, etc.)</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="tight" navProps={{ showBackButton: true, backLabel: "Back" }}>
      <SEOHead
        title="Post a Project — Get Freelance Quotes | Digs & Gigs"
        description="Post a gig and get bids from Diggers. No cost to post—pay when you award or unlock leads."
        keywords="post gig, hire digger, get bids"
      />

      <div className="space-y-8 animate-fade-in-up">
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Free to post • No obligations
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Tell Us What You Need
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Describe your gig. Diggers will bid and you'll see proposals here—award when you're ready.
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center p-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">Fast Responses</span>
          </div>
          <div className="flex flex-col items-center text-center p-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Verified Pros</span>
          </div>
          <div className="flex flex-col items-center text-center p-3">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-2">
              <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-muted-foreground">Direct Contact</span>
          </div>
        </div>

        {/* Friendly alert: only client account (gigger mode) can post */}
        {showGiggerOnlyAlert && (
          <div
            role="alert"
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <UserCircle className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Post gigs with your Gigger account
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You're in Digger mode. To post a gig and get bids from Diggers, switch to Gigger or sign up as a Gigger.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {hasGiggerRole ? (
                    <Button
                      type="button"
                      onClick={() => switchRole("gigger")}
                      className="rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      Switch to Gigger
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/register?type=gigger")}
                      className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Get a Gigger account
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/role-dashboard")}
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Go to dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <PostGigProgressDots currentStep={getCurrentStep()} totalSteps={4} />

        {/* Main Form Card */}
        <Card className="border-border/50 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 pb-6">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              Project Details
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              The more details you provide, the better matches you'll receive.
            </p>
          </CardHeader>

          <CardContent className="pt-8">
            <form onSubmit={handleSubmitCheck} className="space-y-8">
              
              {/* Step 1: Problem Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="problem" className="text-base font-semibold">
                    What are you trying to do? <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 1 of 4</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select the option that best describes your project needs.
                </p>
                <Select value={selectedProblemId} onValueChange={handleProblemChange}>
                  <SelectTrigger id="problem" className="w-full h-12 text-base rounded-xl border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Choose a project type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBLEM_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="py-3">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Clarifying Question */}
              {selectedProblem && (
                <div className="space-y-4 animate-fade-in-up p-6 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {selectedProblem.clarifyingQuestion} <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 2 of 4</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isCustomProblem(selectedProblemId)
                      ? "Choose how you want to describe your project so Diggers can customize their ideas to match."
                      : "Select all that apply so Diggers can find your gig."}
                  </p>
                  <div className="grid gap-3 mt-4">
                    {selectedProblem.clarifyingOptions.map((option) => {
                      const isChecked = clarifyingAnswers.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          htmlFor={`clarifying-${option.value}`}
                          className={`flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                            isChecked 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            id={`clarifying-${option.value}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleClarifyingToggle(option.value, checked === true)}
                            className="h-5 w-5"
                          />
                          <span className="flex-1 text-sm font-medium">{option.label}</span>
                          {isChecked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </label>
                      );
                    })}
                  </div>
                  {isCustomProblem(selectedProblemId) && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="custom-project-label" className="text-sm font-medium text-muted-foreground">
                        Custom project type or label (optional)
                      </Label>
                      <Input
                        id="custom-project-label"
                        placeholder="e.g. Custom mobile app, One-off consulting, Hybrid design + dev"
                        value={customProjectLabel}
                        onChange={(e) => setCustomProjectLabel(e.target.value)}
                        className="rounded-xl border-border/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        This is shown to Diggers so they can tailor their proposals to your idea.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Description */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Project Description <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 3 of 4</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe what you want done. Include any specific requirements, goals, or examples.
                </p>
                <AIDescriptionTextarea
                  id="description"
                  value={description}
                  onChange={setDescription}
                  problemLabel={selectedProblem?.label}
                  clarifyingLabel={clarifyingAnswers
                    .map(answer => selectedProblem?.clarifyingOptions.find(o => o.value === answer)?.label)
                    .filter(Boolean)
                    .join(', ')}
                  required
                />
              </div>

              {/* Skills required (optional) - type to see related skills in dropdown, or press Enter for custom */}
              <div className="space-y-3 p-6 rounded-xl bg-muted/20 border border-border/50">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Skills required <span className="text-muted-foreground font-normal text-sm">(optional)</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Type a skill to see suggestions; click one or press Enter to add. Diggers use this to match and tailor their proposals.
                </p>
                {skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skillsRequired.map((skill, index) => (
                      <Badge
                        key={`${skill}-${index}`}
                        variant="secondary"
                        className="pl-2.5 pr-1.5 py-1.5 text-sm font-medium rounded-lg"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="ml-1.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative max-w-md">
                  <Input
                    placeholder="Type to search skills (e.g. React, SEO, design)..."
                    value={skillInput}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      setSkillDropdownOpen(true);
                    }}
                    onFocus={() => setSkillDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setSkillDropdownOpen(false), 180)}
                    onKeyDown={handleSkillInputKeyDown}
                    className="rounded-xl border-border/60"
                  />
                  {skillDropdownOpen && (skillInput.trim() || allSkills.length > 0) && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-48 overflow-auto py-1">
                      {(() => {
                        const q = skillInput.trim().toLowerCase();
                        const filtered = allSkills
                          .filter((s) => !skillsRequired.some((x) => x.toLowerCase() === s.name.toLowerCase()))
                          .filter((s) => !q || s.name.toLowerCase().includes(q))
                          .slice(0, 20);
                        if (filtered.length === 0 && skillInput.trim()) {
                          return (
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onMouseDown={(e) => { e.preventDefault(); addSkill(normalizeSkillInput(skillInput)); setSkillInput(""); setSkillDropdownOpen(false); }}
                            >
                              Add &quot;{skillInput.trim()}&quot;
                            </button>
                          );
                        }
                        return filtered.map((skill) => (
                          <button
                            type="button"
                            key={skill.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onMouseDown={(e) => { e.preventDefault(); addSkill(skill.name); setSkillInput(""); setSkillDropdownOpen(false); }}
                          >
                            {skill.name}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Budget & Timeline */}
              <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Budget & Timeline
                  </h3>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 4 of 4</span>
                </div>

                {/* Project type: Fixed vs Hourly */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Project type</Label>
                  <p className="text-xs text-muted-foreground">
                    Fixed: one price for the whole project. Hourly: pay by the hour with an optional estimated total.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setProjectType("fixed")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        projectType === "fixed"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Fixed project
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectType("hourly")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        projectType === "hourly"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Hourly project
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {projectType === "fixed" ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Budget Range <span className="text-destructive">*</span></Label>
                      <p className="text-xs text-muted-foreground">
                        Enter your expected budget range. This helps Diggers tailor their bids.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="budgetMin" className="text-xs text-muted-foreground">Minimum</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input
                              id="budgetMin"
                              placeholder="1,000"
                              value={budgetMin}
                              onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                              className="pl-8 h-12 rounded-xl border-border/50 text-base"
                              required={projectType === "fixed"}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="budgetMax" className="text-xs text-muted-foreground">Maximum</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input
                              id="budgetMax"
                              placeholder="2,500"
                              value={budgetMax}
                              onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                              className="pl-8 h-12 rounded-xl border-border/50 text-base"
                              required={projectType === "fixed"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Hourly rate range <span className="text-destructive">*</span></Label>
                        <p className="text-xs text-muted-foreground">
                          What hourly rate ($/hr) are you comfortable with? Enter min, max, or both. Diggers will propose their rate.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="hourlyRateMin" className="text-xs text-muted-foreground">Min $/hr</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                              <Input
                                id="hourlyRateMin"
                                type="number"
                                min={0}
                                step={5}
                                placeholder="50"
                                value={hourlyRateMin}
                                onChange={(e) => setHourlyRateMin(e.target.value)}
                                className="pl-8 h-12 rounded-xl border-border/50 text-base"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="hourlyRateMax" className="text-xs text-muted-foreground">Max $/hr</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                              <Input
                                id="hourlyRateMax"
                                type="number"
                                min={0}
                                step={5}
                                placeholder="100"
                                value={hourlyRateMax}
                                onChange={(e) => setHourlyRateMax(e.target.value)}
                                className="pl-8 h-12 rounded-xl border-border/50 text-base"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estimated hours <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <p className="text-xs text-muted-foreground">
                          Rough estimate of hours needed. Helps Diggers and lead pricing.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="estimatedHoursMin" className="text-xs text-muted-foreground">Min hours</Label>
                            <Input
                              id="estimatedHoursMin"
                              type="number"
                              min={0}
                              step={1}
                              placeholder="10"
                              value={estimatedHoursMin}
                              onChange={(e) => setEstimatedHoursMin(e.target.value)}
                              className="h-12 rounded-xl border-border/50 text-base"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="estimatedHoursMax" className="text-xs text-muted-foreground">Max hours</Label>
                            <Input
                              id="estimatedHoursMax"
                              type="number"
                              min={0}
                              step={1}
                              placeholder="20"
                              value={estimatedHoursMax}
                              onChange={(e) => setEstimatedHoursMax(e.target.value)}
                              className="h-12 rounded-xl border-border/50 text-base"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="timeline" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Timeline <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When do you need this project completed?
                    </p>
                    <Select value={timeline} onValueChange={setTimeline}>
                      <SelectTrigger id="timeline" className="w-full h-12 rounded-xl border-border/50 text-base">
                        <SelectValue placeholder="Select a timeline..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="py-3">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job type: Remote, Hybrid, On-site, Flexible */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Job type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      How should the work be done? Helps Diggers know if they can apply.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "remote" as const, label: "Remote" },
                        { value: "hybrid" as const, label: "Hybrid" },
                        { value: "onsite" as const, label: "On-site" },
                        { value: "flexible" as const, label: "Flexible" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setWorkType(opt.value)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            workType === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Region Preference */}
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Preferred Freelancer Location <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Select regions or countries where you'd prefer Diggers to be located. 
                      Leave empty for all regions. Click a region to expand and select individual countries.
                    </p>
                    {preferredRegions.length > 0 && (
                      <p className="text-xs text-primary font-medium">
                        Selected: {formatSelectionDisplay(preferredRegions)}
                      </p>
                    )}
                    <RegionCountrySelector
                      selectedValues={preferredRegions}
                      onChange={setPreferredRegions}
                    />
                  </div>
                </div>
              </div>

              {/* Contact: use account details for signed-in giggers; no need to re-enter name/email/phone */}
              <div className="space-y-4 pt-6 border-t border-border/50">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Contact for this project
                </h3>
                {user?.id ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        We'll use your account details (name and email{accountContact?.phone ? ", and phone" : ""}) so you don't have to enter them again. Diggers can contact you after they unlock the lead or get awarded.
                      </p>
                      {(accountContact?.full_name || accountContact?.email) && (
                        <p className="text-sm font-medium mt-2 text-foreground">
                          {accountContact.full_name || "—"}, {accountContact.email || user?.email || "—"}
                          {accountContact.phone ? ` · ${accountContact.phone}` : ""}
                        </p>
                      )}
                    </div>
                    {/* Multiple contact methods: WhatsApp, Telegram, Teams, etc. */}
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        Add more ways for Diggers to contact you (optional)
                      </p>
                      {contactItems.map((item, index) => {
                        const method = GIGGER_CONTACT_METHODS.find((m) => m.id === item.type);
                        return (
                          <div key={`${item.type}-${index}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium shrink-0">{method?.label ?? item.type}:</span>
                            <Input
                              value={item.value}
                              onChange={(e) =>
                                setContactItems((prev) =>
                                  prev.map((x, i) => (i === index ? { ...x, value: e.target.value } : x))
                                )
                              }
                              placeholder={method?.placeholder}
                              type={method?.inputType ?? "text"}
                              className="h-9 flex-1 min-w-[140px] rounded-lg text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setContactItems((prev) => prev.filter((_, i) => i !== index))}
                              aria-label="Remove"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={contactAddType}
                          onValueChange={setContactAddType}
                        >
                          <SelectTrigger className="h-9 w-[180px] rounded-lg text-sm">
                            <SelectValue placeholder="Add contact method" />
                          </SelectTrigger>
                          <SelectContent>
                            {GIGGER_CONTACT_METHODS.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={contactAddValue}
                          onChange={(e) => setContactAddValue(e.target.value)}
                          placeholder={
                            GIGGER_CONTACT_METHODS.find((m) => m.id === contactAddType)?.placeholder ?? "Value"
                          }
                          type={GIGGER_CONTACT_METHODS.find((m) => m.id === contactAddType)?.inputType ?? "text"}
                          className="h-9 flex-1 min-w-[160px] rounded-lg text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (contactAddType && contactAddValue.trim()) {
                                setContactItems((prev) => [...prev, { type: contactAddType, value: contactAddValue.trim() }]);
                                setContactAddValue("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => {
                            if (contactAddType && contactAddValue.trim()) {
                              setContactItems((prev) => [...prev, { type: contactAddType, value: contactAddValue.trim() }]);
                              setContactAddValue("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-5">
                    <p className="text-sm text-muted-foreground">
                      Sign in to post a project; we'll use your account details so you don't have to re-enter them.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="clientName" className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Your Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="clientName"
                        placeholder="John Smith"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="h-12 rounded-xl border-border/50 text-base"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="h-12 rounded-xl border-border/50 text-base"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input
                        id="clientPhone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="h-12 rounded-xl border-border/50 text-base"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lead Price Preview */}
              {((projectType === "fixed" && (budgetMin || budgetMax)) || (projectType === "hourly" && (hourlyRateMin || hourlyRateMax))) && (
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Freelancers pay to unlock this lead:
                      </div>
                      <div className="text-3xl font-bold text-primary">${leadPrice}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      8% of project budget<br />($3–$49)
                    </div>
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl p-6 border border-green-200/50 dark:border-green-800/30">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  What happens next?
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-green-200 dark:bg-green-800">
                      <CheckCircle2 className="h-3 w-3 text-green-700 dark:text-green-300" />
                    </div>
                    <span className="text-sm text-green-800 dark:text-green-200">
                      <strong>Confirm your email</strong> — We'll send a quick verification link
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-green-200 dark:bg-green-800">
                      <CheckCircle2 className="h-3 w-3 text-green-700 dark:text-green-300" />
                    </div>
                    <span className="text-sm text-green-800 dark:text-green-200">
                      <strong>Your project goes live</strong> — Freelancers can view and unlock it
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-green-200 dark:bg-green-800">
                      <CheckCircle2 className="h-3 w-3 text-green-700 dark:text-green-300" />
                    </div>
                    <span className="text-sm text-green-800 dark:text-green-200">
                      <strong>Get bids from Diggers</strong> — They'll send proposals; you award when ready
                    </span>
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Posting Your Project...
                  </>
                ) : (
                  <>
                    Post My Project
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Trust Footer */}
              <p className="text-center text-xs text-muted-foreground">
                By posting, you agree to our terms. Your info is private and only shared with Diggers who unlock your lead.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* High-Risk Warning Dialog */}
      <HighRiskWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        matchedKeywords={matchedKeywords}
        onContinue={async () => {
          setShowWarningDialog(false);
          await submitGig();
        }}
        onCancel={() => {
          setShowWarningDialog(false);
        }}
      />
    </PageLayout>
  );
};

export default PostGig;
