import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { HighRiskWarningDialog } from "@/components/HighRiskWarningDialog";
import { checkHighRiskKeywords, TECH_CATEGORIES } from "@/config/techCategories";
import { PROBLEM_OPTIONS, TIMELINE_OPTIONS, getProblemById, getInternalMapping } from "@/config/giggerProblems";

const PostGig = () => {
  const navigate = useNavigate();
  const { trackEvent, isConfigured } = useFacebookPixel();
  const [loading, setLoading] = useState(false);
  
  // Form fields - Problem-based approach
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [clarifyingAnswer, setClarifyingAnswer] = useState("");
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
    if (!min && !max) return 9;
    const avg = (min + max) / 2;
    const price = Math.round(avg * 0.03);
    return Math.max(9, Math.min(49, price));
  };

  const validateForm = (): boolean => {
    if (!selectedProblemId) {
      toast.error("Please select what you're trying to do");
      return false;
    }
    if (!clarifyingAnswer) {
      toast.error("Please answer the follow-up question");
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

  const handleSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check for high-risk keywords
    const textToCheck = description;
    const riskCheck = checkHighRiskKeywords(textToCheck);
    
    if (riskCheck.hasRisk) {
      setMatchedKeywords(riskCheck.matchedKeywords);
      setShowWarningDialog(true);
    } else {
      submitGig();
    }
  };

  const submitGig = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const consumerId = session?.user?.id || null;

      // Get internal mapping from problem selection
      const mapping = getInternalMapping(selectedProblemId);
      const category = TECH_CATEGORIES.find(c => c.id === mapping?.categoryId);
      
      // Build title from problem + clarifying answer
      const problem = getProblemById(selectedProblemId);
      const clarifyingOption = problem?.clarifyingOptions.find(o => o.value === clarifyingAnswer);
      const title = `${problem?.label || 'Project'} - ${clarifyingOption?.label || ''}`.trim();

      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: consumerId,
          title: title,
          description: description.trim(),
          requirements: `Problem: ${problem?.label}\nDetails: ${clarifyingOption?.label}`,
          budget_min: parseCurrency(budgetMin),
          budget_max: parseCurrency(budgetMax),
          timeline: TIMELINE_OPTIONS.find(t => t.value === timeline)?.label || timeline,
          location: "Remote",
          client_name: clientName.trim(),
          consumer_email: clientEmail.trim(),
          consumer_phone: clientPhone.trim() || null,
          category: category?.name || null,
          status: "open",
          confirmation_status: "confirmed",
          is_confirmed_lead: true,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Trigger email blast
      await supabase.functions.invoke("blast-lead-to-diggers", {
        body: { leadId: gigData.id }
      }).catch(err => console.error("Blast error:", err));

      if (isConfigured) {
        trackEvent('Lead', { content_name: 'Gig Posted', content_ids: [gigData.id] });
      }

      toast.success("Your project has been posted! Freelancers are being notified.");
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
    } catch (error: any) {
      console.error("Error posting gig:", error);
      toast.error("Failed to post project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProblemChange = (value: string) => {
    setSelectedProblemId(value);
    setClarifyingAnswer(""); // Reset clarifying answer when problem changes
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Post Your Project</CardTitle>
            <CardDescription>
              Tell us what you need — we'll match you with the right freelancers
            </CardDescription>
          </CardHeader>

          <CardContent>
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

              {/* Step 2: Clarifying Question (Conditional) */}
              {selectedProblem && (
                <div className="space-y-2 animate-in fade-in-50 duration-300">
                  <Label htmlFor="clarifying">
                    {selectedProblem.clarifyingQuestion} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={clarifyingAnswer} onValueChange={setClarifyingAnswer}>
                    <SelectTrigger id="clarifying" className="w-full">
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProblem.clarifyingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Step 3: Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Describe what you want done <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="No technical terms needed. Just explain the goal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  No technical terms needed. Just explain the goal.
                </p>
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
                    3% of average budget (min $9, max $49)
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Your project is emailed to freelancers instantly
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Interested freelancers unlock your contact info
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    They reach out to you directly
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
        onContinue={() => {
          setShowWarningDialog(false);
          submitGig();
        }}
        onCancel={() => setShowWarningDialog(false)}
      />
    </div>
  );
};

export default PostGig;
