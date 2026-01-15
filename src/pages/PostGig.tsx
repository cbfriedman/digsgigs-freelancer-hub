import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AIDescriptionTextarea } from "@/components/AIDescriptionTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { HighRiskWarningDialog } from "@/components/HighRiskWarningDialog";
import { CATEGORY_IDS, checkHighRiskKeywords, TECH_CATEGORIES } from "@/config/techCategories";
import { PROBLEM_OPTIONS, TIMELINE_OPTIONS, getProblemById, getInternalMapping } from "@/config/giggerProblems";

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
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // High-risk warning state
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);

  // Get current problem option for clarifying question
  const selectedProblem = getProblemById(selectedProblemId);

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
    if (!min && !max) return 1;
    const avg = (min + max) / 2;
    const price = Math.round(avg * 0.03);
    return Math.min(49, Math.max(1, price)); // No minimum, $49 cap
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

    // Check for high-risk keywords
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
    setClarifyingAnswers([]); // Reset clarifying answers when problem changes
  };

  const handleClarifyingToggle = (value: string, checked: boolean) => {
    if (checked) {
      setClarifyingAnswers(prev => [...prev, value]);
    } else {
      setClarifyingAnswers(prev => prev.filter(v => v !== value));
    }
  };

  // Submit gig with form data
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

      // No authentication required - allow anonymous posting (Craigslist model)
      const consumerId = null;

      // Get internal mapping from problem selection
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
      
      // Build title from problem + clarifying answers
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
          status: "pending_confirmation",
          confirmation_status: "pending",
          is_confirmed_lead: false,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Send confirmation email instead of blasting immediately
      await supabase.functions.invoke("send-gig-confirmation", {
        body: {
          gigId: gigData.id,
          email: finalClientEmail.trim(),
          gigTitle: title,
          gigDescription: finalDescription.trim(),
          location: "Remote",
          budgetMin: finalBudgetMin,
          budgetMax: finalBudgetMax,
          keywords: category?.name ? [category.name] : [],
        }
      }).catch(err => console.error("Confirmation email error:", err));

      if (isConfigured) {
        trackEvent('Lead', { content_name: 'Gig Posted', content_ids: [gigData.id] });
      }

      toast.success("Check your email to confirm your project!");
      navigate(`/gig-pending?gigId=${gigData.id}&email=${encodeURIComponent(finalClientEmail.trim())}`);
    } catch (error: any) {
      console.error("Error posting gig:", error);
      toast.error("Failed to post project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const leadPrice = calculateLeadPrice();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Project — Get Freelance Quotes | Digs & Gigs"
        description="Post your project and get connected with skilled freelancers instantly."
        keywords="post project, hire freelancer, get quotes"
      />
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Post Your Project</CardTitle>
            <CardDescription>
              Tell us what you need — we'll match you with the right freelancers
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmitCheck} className="space-y-6">
              
              {/* Step 1: Problem Selection */}
              <div className="space-y-2">
                <Label htmlFor="problem">
                  What are you trying to do? <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedProblemId} onValueChange={handleProblemChange}>
                  <SelectTrigger id="problem" className="w-full">
                    <SelectValue placeholder="Select an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBLEM_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Clarifying Question (Conditional) - Multi-select */}
              {selectedProblem && (
                <div className="space-y-3 animate-in fade-in-50 duration-300">
                  <Label>
                    {selectedProblem.clarifyingQuestion} <span className="text-destructive">*</span>
                    <span className="text-xs text-muted-foreground ml-2">(Select all that apply)</span>
                  </Label>
                  <div className="grid gap-2">
                    {selectedProblem.clarifyingOptions.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleClarifyingToggle(option.value, !clarifyingAnswers.includes(option.value))}
                      >
                        <Checkbox
                          id={`clarifying-${option.value}`}
                          checked={clarifyingAnswers.includes(option.value)}
                          onCheckedChange={(checked) => handleClarifyingToggle(option.value, checked === true)}
                        />
                        <label
                          htmlFor={`clarifying-${option.value}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Describe what you want done <span className="text-destructive">*</span>
                </Label>
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

              {/* Step 4: Budget Range */}
              <div className="space-y-2">
                <Label>Budget Range <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="budgetMin" className="text-xs text-muted-foreground">Minimum ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMin"
                        placeholder="1,000"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="budgetMax" className="text-xs text-muted-foreground">Maximum ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMax"
                        placeholder="2,500"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Timeline */}
              <div className="space-y-2">
                <Label htmlFor="timeline">
                  Timeline <span className="text-destructive">*</span>
                </Label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger id="timeline" className="w-full">
                    <SelectValue placeholder="When do you need this done?" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 6: Contact Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Your Contact Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="clientName"
                    placeholder="John Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone (optional)</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Lead Price Preview */}
              {(budgetMin || budgetMax) && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">
                    Freelancers will pay to unlock this lead:
                  </div>
                  <div className="text-2xl font-bold text-primary">${leadPrice}</div>
                  <div className="text-xs text-muted-foreground">
                    3% of average budget (max $49)
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Check your email to confirm your project
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    After confirmation, your project goes live
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Freelancers unlock your contact info and reach out
                  </li>
                </ul>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    Post Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />

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
    </div>
  );
};

export default PostGig;
