import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AIDescriptionTextarea } from "@/components/AIDescriptionTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2, Lightbulb, DollarSign, Clock, User, Mail, Phone, Sparkles, Shield, Zap, MessageSquare, Globe, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import SEOHead from "@/components/SEOHead";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { HighRiskWarningDialog } from "@/components/HighRiskWarningDialog";
import { CATEGORY_IDS, checkHighRiskKeywords, TECH_CATEGORIES } from "@/config/techCategories";
import { PROBLEM_OPTIONS, TIMELINE_OPTIONS, getProblemById, getInternalMapping } from "@/config/giggerProblems";
import { formatSelectionDisplay } from "@/config/regionOptions";
import PageLayout from "@/components/layout/PageLayout";
import PostGigProgressDots from "@/components/PostGigProgressDots";
import { RegionCountrySelector } from "@/components/RegionCountrySelector";
import { FloatingVoiceAgent, ExtractedGigData } from "@/components/FloatingVoiceAgent";

const PostGig = () => {
  const navigate = useNavigate();
  const { trackEvent, isConfigured } = useFacebookPixel();
  const [loading, setLoading] = useState(false);
  
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

  // High-risk warning state
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);

  // Voice agent state
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");

  // Check AI Voice backend availability once on mount
  useEffect(() => {
    let cancelled = false;
    setVoiceStatus("checking");
    invokeEdgeFunction(supabase, "elevenlabs-conversation-token")
      .then((data: { signedUrl?: string }) => {
        if (!cancelled && data?.signedUrl) setVoiceStatus("available");
        else if (!cancelled) setVoiceStatus("unavailable");
      })
      .catch(() => {
        if (!cancelled) setVoiceStatus("unavailable");
      });
    return () => { cancelled = true; };
  }, []);

  // Get current problem option for clarifying question
  const selectedProblem = getProblemById(selectedProblemId);

  // Handle data extracted from voice agent (called when agent uses update_gig_details tool or when modal closes)
  const handleVoiceDataExtracted = useCallback((data: ExtractedGigData) => {
    if (!data || typeof data !== "object") return;
    if (data.problemId) {
      setSelectedProblemId(data.problemId);
      const problem = getProblemById(data.problemId);
      if (problem && problem.clarifyingOptions.length > 0 && clarifyingAnswers.length === 0) {
        setClarifyingAnswers([problem.clarifyingOptions[0].value]);
      }
    }
    if (data.description) setDescription(String(data.description).trim());
    if (data.budgetMin != null) setBudgetMin(formatCurrency(String(data.budgetMin)));
    if (data.budgetMax != null) setBudgetMax(formatCurrency(String(data.budgetMax)));
    if (data.timeline) setTimeline(String(data.timeline).trim());
    if (data.clientName) setClientName(String(data.clientName).trim());
    if (data.clientEmail) setClientEmail(String(data.clientEmail).trim());
    if (data.clientPhone) setClientPhone(String(data.clientPhone).trim());
  }, [clarifyingAnswers.length]);

  // Calculate current step for progress indicator
  const getCurrentStep = () => {
    if (!selectedProblemId) return 1;
    if (clarifyingAnswers.length === 0) return 1;
    if (!description.trim()) return 2;
    if (!budgetMin || !budgetMax || !timeline) return 3;
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

  const calculateLeadPrice = (): number => {
    const min = parseCurrency(budgetMin);
    const max = parseCurrency(budgetMax);
    if (!min && !max) return 3;
    const avg = (min + max) / 2;
    const percentagePrice = avg * 0.02;
    const price = Math.max(3, Math.round(percentagePrice));
    return Math.min(49, price);
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
    if (!budgetMin.trim() || !budgetMax.trim()) {
      toast.error("Please enter your budget range (min and max)");
      return false;
    }
    if (!timeline) {
      toast.error("Please select a timeline");
      return false;
    }
    if (!clientName.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!clientEmail.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    return true;
  };

  const handleSubmitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setLoading(true);
    try {
      const finalProblemId = selectedProblemId;
      const finalDescription = description;
      const finalBudgetMin = parseCurrency(budgetMin);
      const finalBudgetMax = parseCurrency(budgetMax);
      const finalTimeline = timeline;
      const finalClientName = clientName;
      const finalClientEmail = clientEmail;
      const finalClientPhone = clientPhone;
      const finalClarifyingAnswers = clarifyingAnswers;

      const consumerId = null;

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
      const title = `${problem?.label || 'Project'}${clarifyingLabels ? ` - ${clarifyingLabels}` : ''}`.trim();

      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: consumerId,
          title: title,
          description: finalDescription.trim(),
          requirements: `Problem: ${problem?.label}\nDetails: ${clarifyingLabels || 'Not specified'}\nCategory: ${category?.name || "Not specified"}`,
          budget_min: finalBudgetMin,
          budget_max: finalBudgetMax,
          timeline: TIMELINE_OPTIONS.find(t => t.value === finalTimeline)?.label || finalTimeline,
          location: "Remote",
          client_name: finalClientName.trim(),
          consumer_email: finalClientEmail.trim(),
          consumer_phone: finalClientPhone.trim() || null,
          category_id: categoryId,
          status: "open",
          confirmation_status: "confirmed",
          is_confirmed_lead: true,
          confirmed_at: new Date().toISOString(),
          preferred_regions: preferredRegions.length > 0 ? preferredRegions : null,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Send management email with edit/cancel links (no confirmation required)
      supabase.functions.invoke("send-gig-management-email", {
        body: { gigId: gigData.id }
      }).catch(err => console.error("Management email error:", err));

      // Blast to PRO diggers immediately
      supabase.functions.invoke("blast-lead-to-diggers", {
        body: { leadId: gigData.id, proOnly: true }
      }).catch(err => console.error("Pro blast error:", err));

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
      toast.error("Failed to post project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const leadPrice = calculateLeadPrice();

  return (
    <PageLayout maxWidth="tight" navProps={{ showBackButton: true, backLabel: "Back" }}>
      <SEOHead
        title="Post a Project — Get Freelance Quotes | Digs & Gigs"
        description="Post your project and get connected with skilled freelancers instantly."
        keywords="post project, hire freelancer, get quotes"
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
            Describe your project and we'll connect you with qualified freelancers ready to help.
          </p>
          
          {/* Voice Assistant Option */}
          <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsVoiceAgentOpen(true)}
              disabled={voiceStatus === "unavailable"}
              className="gap-2 border-primary/30 hover:bg-primary/5"
            >
              <Mic className="h-4 w-4" />
              Or talk to Morgan instead
            </Button>
            {voiceStatus === "checking" && (
              <Badge variant="secondary" className="text-xs font-normal">Checking voice…</Badge>
            )}
            {voiceStatus === "available" && (
              <Badge variant="secondary" className="text-xs font-normal bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Voice ready</Badge>
            )}
            {voiceStatus === "unavailable" && (
              <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">Voice unavailable</Badge>
            )}
          </div>
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
                    Select all that apply to help us find the right freelancers.
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

              {/* Step 4: Budget & Timeline */}
              <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Budget & Timeline
                  </h3>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 4 of 4</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Budget Range <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground">
                      Enter your expected budget range. This helps freelancers understand your expectations.
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
                            required
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
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

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

                  {/* Region Preference */}
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Preferred Freelancer Location <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Select regions or specific countries where you'd prefer freelancers to be located. 
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

              {/* Contact Information */}
              <div className="space-y-6 pt-6 border-t border-border/50">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Your Contact Information
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Freelancers will use this to contact you about your project.
                  </p>
                </div>
                
                <div className="grid gap-5">
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
                    <p className="text-xs text-muted-foreground">
                      We'll send a confirmation email to verify your project.
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Add your phone if you'd like freelancers to call you directly.
                    </p>
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
              </div>

              {/* Lead Price Preview */}
              {(budgetMin || budgetMax) && (
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Freelancers pay to unlock this lead:
                      </div>
                      <div className="text-3xl font-bold text-primary">${leadPrice}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        2% of average budget
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Maximum: $49
                      </div>
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
                      <strong>Get contacted directly</strong> — Freelancers reach out with proposals
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
                By posting, you agree to our terms. Your information is kept private and only shared with freelancers who unlock your project.
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

      {/* Floating Voice Agent */}
      <FloatingVoiceAgent
        isOpen={isVoiceAgentOpen}
        onClose={() => setIsVoiceAgentOpen(false)}
        onDataExtracted={handleVoiceDataExtracted}
      />
    </PageLayout>
  );
};

export default PostGig;
