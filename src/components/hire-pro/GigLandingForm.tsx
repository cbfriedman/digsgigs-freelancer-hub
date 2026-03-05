import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Lightbulb, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  AlertCircle,
  User,
  Mail,
  Phone
} from "lucide-react";
import { PROBLEM_OPTIONS, TIMELINE_OPTIONS } from "@/config/giggerProblems";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import { normalizeToE164US } from "@/lib/phone";
import { buildGigDraftPayload, hasDraftContent } from "@/lib/gigDraftUtils";
import { getReferralCodeFromStorage } from "@/lib/referralUtils";

interface GigLandingFormProps {
  onComplete?: (data: FormData) => void;
}

interface FormData {
  projectTypes: string[];
  description: string;
  budgetMin: number;
  budgetMax: number;
  timeline: string;
  preferredRegions: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}
 
 // Budget suggestion based on project types and description length
 const BUDGET_SUGGESTIONS: Record<string, { min: number; max: number }> = {
   'build-website': { min: 2000, max: 5000 },
   'build-webapp': { min: 5000, max: 15000 },
   'design-something': { min: 1000, max: 3000 },
   'get-customers': { min: 1500, max: 4000 },
   'automate-ai': { min: 3000, max: 8000 },
   'business-systems': { min: 2000, max: 5000 },
   'create-content': { min: 500, max: 2000 },
 };
 
export function GigLandingForm({ onComplete }: GigLandingFormProps) {
  const navigate = useNavigate();
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [suggestedBudget, setSuggestedBudget] = useState<{ min: number; max: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft: stable session id and draft id for gig_drafts
  const sessionIdRef = useRef<string>("");
  const draftIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let sid = sessionStorage.getItem("gig_draft_session_id");
    if (!sid) {
      sid = "gig-" + crypto.randomUUID();
      sessionStorage.setItem("gig_draft_session_id", sid);
    }
    sessionIdRef.current = sid;
  }, []);

  // Save draft to gig_drafts (debounced)
  const saveDraft = useCallback(async () => {
    if (typeof window !== "undefined" && !sessionIdRef.current) {
      let sid = sessionStorage.getItem("gig_draft_session_id");
      if (!sid) {
        sid = "gig-" + crypto.randomUUID();
        sessionStorage.setItem("gig_draft_session_id", sid);
      }
      sessionIdRef.current = sid;
    }
    if (!hasDraftContent(description, clientEmail)) return;
    const source = typeof window !== "undefined" ? (sessionStorage.getItem("gig_source") || "website") : "website";
    const payload = buildGigDraftPayload({
      sessionId: sessionIdRef.current,
      email: clientEmail || null,
      name: clientName || null,
      phone: clientPhone || null,
      projectTypes: selectedProjectTypes,
      description: description || null,
      budgetMin: parseCurrency(budgetMin) || null,
      budgetMax: parseCurrency(budgetMax) || null,
      timeline: timeline || null,
      source,
    });
    try {
      if (draftIdRef.current) {
        await supabase
          .from("gig_drafts")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", draftIdRef.current);
      } else {
        const { data, error } = await supabase
          .from("gig_drafts")
          .insert(payload)
          .select("id")
          .single();
        if (!error && data?.id) {
          draftIdRef.current = data.id;
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem("gig_draft_id", data.id);
        }
      }
    } catch (_) {
      // ignore draft save errors
    }
  }, [selectedProjectTypes, description, budgetMin, budgetMax, timeline, clientName, clientEmail, clientPhone]);

  // Debounced draft save every 8s when form has content (faster capture for follow-up emails)
  const DRAFT_SAVE_INTERVAL_MS = 8000;
  useEffect(() => {
    if (!hasDraftContent(description, clientEmail)) return;
    const t = setTimeout(saveDraft, DRAFT_SAVE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [saveDraft, description, clientEmail]);

  // Restore draft id from sessionStorage on mount
  useEffect(() => {
    const stored = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("gig_draft_id") : null;
    if (stored) draftIdRef.current = stored;
  }, []);

  // Calculate suggested budget based on selected project types and description
  useEffect(() => {
    if (selectedProjectTypes.length === 0) {
      setSuggestedBudget(null);
      return;
    }

    // Calculate average budget from selected types
    let totalMin = 0;
    let totalMax = 0;
    let count = 0;

    selectedProjectTypes.forEach(type => {
      const suggestion = BUDGET_SUGGESTIONS[type];
      if (suggestion) {
        totalMin += suggestion.min;
        totalMax += suggestion.max;
        count++;
      }
    });

    if (count > 0) {
      // Average of selected types, multiplied by type count (more types = more work)
      const multiplier = Math.min(selectedProjectTypes.length, 2); // Cap at 2x
      const baseMin = Math.round(totalMin / count);
      const baseMax = Math.round(totalMax / count);
      
      // Adjust based on description complexity
      const descriptionMultiplier = description.length > 500 ? 1.2 : 
                                     description.length > 200 ? 1.1 : 1;
      
      setSuggestedBudget({
        min: Math.round(baseMin * multiplier * descriptionMultiplier),
        max: Math.round(baseMax * multiplier * descriptionMultiplier),
      });
    }
  }, [selectedProjectTypes, description]);

  // Validate budget range (max must be within 20% of min)
  useEffect(() => {
    const min = parseCurrency(budgetMin);
    const max = parseCurrency(budgetMax);
    
    if (min && max) {
      const maxAllowed = min * 1.2;
      if (max > maxAllowed) {
        setBudgetError(`Maximum budget should be within 20% of minimum ($${formatNumber(Math.round(maxAllowed))})`);
      } else if (max < min) {
        setBudgetError("Maximum budget must be greater than minimum");
      } else {
        setBudgetError(null);
      }
    } else {
      setBudgetError(null);
    }
  }, [budgetMin, budgetMax]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
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

  const handleProjectTypeToggle = (typeId: string, checked: boolean) => {
    setSelectedProjectTypes(prev => {
      if (checked && !prev.includes(typeId)) {
        return [...prev, typeId];
      } else if (!checked && prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      }
      return prev;
    });
  };

  const applySuggestedBudget = () => {
    if (suggestedBudget) {
      setBudgetMin(formatNumber(suggestedBudget.min));
      setBudgetMax(formatNumber(suggestedBudget.max));
    }
  };

  const enhanceDescription = async () => {
    if (!description.trim() || selectedProjectTypes.length === 0) {
      toast.error("Please select project types and add a description first");
      return;
    }

    setIsEnhancing(true);
    try {
      const typeLabels = selectedProjectTypes
        .map(id => PROBLEM_OPTIONS.find(p => p.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      const data = await invokeEdgeFunction<{ enhanced?: string }>(
        supabase,
        "enhance-description",
        {
          body: {
            description,
            context: typeLabels,
          },
        }
      );
      if (data?.enhanced) {
        setDescription(data.enhanced);
        toast.success("Description enhanced!");
      }
    } catch (err: any) {
      console.error("Enhancement error:", err);
      toast.error(err?.message ?? "Couldn't enhance description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (selectedProjectTypes.length === 0) {
      toast.error("Please select at least one project type");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your project");
      return;
    }
    if (!budgetMin || !budgetMax) {
      toast.error("Please enter your budget range");
      return;
    }
    if (budgetError) {
      toast.error(budgetError);
      return;
    }
    if (!timeline) {
      toast.error("Please select a timeline");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!clientEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get primary problem label for title
      const primaryProblem = PROBLEM_OPTIONS.find(p => p.id === selectedProjectTypes[0]);
      const title = primaryProblem?.label || 'Project';

      // Create a temporary consumer ID for guest users
      const { data: { session } } = await supabase.auth.getSession();
      let consumerId = session?.user?.id;

      // For guest submissions, create an anonymous record
      if (!consumerId) {
        // Use the email as a way to create/find a guest user
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', clientEmail.trim().toLowerCase())
          .maybeSingle();

        if (existingProfile) {
          consumerId = existingProfile.id;
        } else {
          // Create the gig without a consumer_id initially, 
          // using a special edge function or guest flow
          const { data: guestData, error: guestError } = await supabase.functions.invoke('create-auth-user', {
            body: {
              email: clientEmail.trim(),
              fullName: clientName.trim(),
              phone: normalizeToE164US(clientPhone) || undefined,
              isGuestGig: true,
            }
          });

          if (guestError) throw guestError;
          consumerId = guestData?.userId;
        }
      }

      if (!consumerId) {
        throw new Error("Could not create user account");
      }

      // Create the gig
      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: consumerId,
          title: title,
          description: description.trim(),
          requirements: `Project Types: ${selectedProjectTypes.map(id => PROBLEM_OPTIONS.find(p => p.id === id)?.label).filter(Boolean).join(', ')}`,
          budget_min: parseCurrency(budgetMin),
          budget_max: parseCurrency(budgetMax),
          timeline: TIMELINE_OPTIONS.find(t => t.value === timeline)?.label || timeline,
          location: "Remote",
          client_name: clientName.trim(),
          consumer_email: clientEmail.trim(),
          consumer_phone: normalizeToE164US(clientPhone) || null,
          status: "open",
          confirmation_status: "confirmed",
          is_confirmed_lead: true,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Send management email with edit/cancel links
      supabase.functions.invoke("send-gig-management-email", {
        body: { gigId: gigData.id }
      }).catch(err => console.error("Management email error:", err));

      // Send to diggers according to admin settings (manual / all / selected)
      supabase.functions.invoke("send-gig-email-by-settings", {
        body: { gigId: gigData.id },
      }).catch((err) => console.error("Gig email by settings error:", err));

      // Send consumer onboarding email
      const projectLink = `${window.location.origin}/gig/${gigData.id}`;
      supabase.functions.invoke("send-consumer-onboarding-email", {
        body: {
          email: clientEmail.trim(),
          firstName: clientName.trim().split(' ')[0] || 'there',
          step: 1,
          projectLink: projectLink,
          projectName: title,
        },
      }).catch(err => console.warn("Consumer onboarding email error:", err));

      // Attribute referral if user came from a referral link
      const referralCode = getReferralCodeFromStorage();
      if (referralCode) {
        supabase.functions.invoke("process-referral", {
          body: {
            referral_code: referralCode,
            gig_id: gigData.id,
            referred_email: clientEmail.trim(),
            referred_user_id: consumerId ?? null,
          },
        }).catch(err => console.warn("Referral attribution error:", err));
      }

      // Mark draft as converted so follow-up is not sent
      if (draftIdRef.current) {
        await supabase
          .from("gig_drafts")
          .update({ converted: true, converted_gig_id: gigData.id, updated_at: new Date().toISOString() })
          .eq("id", draftIdRef.current);
        draftIdRef.current = null;
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("gig_draft_id");
      }

      if (onComplete) {
        onComplete({
          projectTypes: selectedProjectTypes,
          description,
          budgetMin: parseCurrency(budgetMin),
          budgetMax: parseCurrency(budgetMax),
          timeline,
          preferredRegions: [],
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
        });
      }

      toast.success("Your project is live! Check your email for management links.");
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
    } catch (error: any) {
      console.error("Error posting gig:", error);
      toast.error(error?.message || "Failed to post project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
 
   return (
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
         <form onSubmit={handleSubmit} className="space-y-8">
           
           {/* Step 1: Project Type Selection (Multi-select) */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-base font-semibold">
                 What are you trying to do? <span className="text-destructive">*</span>
               </Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 1 of 4</span>
             </div>
             <p className="text-sm text-muted-foreground">
               Select all project types that apply to your needs.
             </p>
            <div className="grid grid-cols-2 gap-2">
               {PROBLEM_OPTIONS.map((option) => {
                 const isChecked = selectedProjectTypes.includes(option.id);
                 return (
                   <label
                     key={option.id}
                     htmlFor={`project-type-${option.id}`}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${
                       isChecked 
                         ? 'border-primary bg-primary/5 shadow-sm' 
                         : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                     }`}
                   >
                     <Checkbox
                       id={`project-type-${option.id}`}
                       checked={isChecked}
                       onCheckedChange={(checked) => handleProjectTypeToggle(option.id, checked === true)}
                      className="h-4 w-4"
                     />
                    <span className="flex-1 text-xs font-medium leading-tight">{option.label}</span>
                    {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                   </label>
                 );
               })}
             </div>
             {selectedProjectTypes.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {selectedProjectTypes.map(typeId => {
                   const option = PROBLEM_OPTIONS.find(p => p.id === typeId);
                   return option ? (
                     <Badge key={typeId} variant="secondary" className="text-xs">
                       {option.label}
                     </Badge>
                   ) : null;
                 })}
               </div>
             )}
           </div>
 
           {/* Step 2: Description */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label htmlFor="description" className="text-base font-semibold">
                 Project Description <span className="text-destructive">*</span>
               </Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 2 of 4</span>
             </div>
             <p className="text-sm text-muted-foreground">
               Describe what you want done. Include any specific requirements, goals, or examples.
             </p>
             <div className="relative">
               <Textarea
                 id="description"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="No technical terms needed. Just explain the goal..."
                 className="min-h-[120px] resize-y rounded-xl border-border/50"
               />
               <div className="flex justify-between items-center mt-2">
                 <span className="text-xs text-muted-foreground">
                   {description.length > 0 ? `${description.length} characters` : 'No technical terms needed. Just explain the goal.'}
                 </span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={enhanceDescription}
                   disabled={isEnhancing || !description.trim() || selectedProjectTypes.length === 0}
                   className="text-xs gap-1"
                 >
                   {isEnhancing ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                   ) : (
                     <Sparkles className="h-3 w-3" />
                   )}
                   Enhance with AI
                 </Button>
               </div>
             </div>
           </div>
 
           {/* Step 3: Budget & Timeline */}
           <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border/50">
             <div className="flex items-center justify-between">
               <h3 className="text-base font-semibold flex items-center gap-2">
                 <DollarSign className="h-5 w-5 text-success" />
                 Budget & Timeline
               </h3>
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 3 of 4</span>
             </div>
 
             {/* Suggested Budget */}
             {suggestedBudget && (
               <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                 <Sparkles className="h-4 w-4 text-accent" />
                 <span className="text-sm flex-1">
                   Suggested budget: <strong>${formatNumber(suggestedBudget.min)} - ${formatNumber(suggestedBudget.max)}</strong>
                 </span>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={applySuggestedBudget}
                   className="text-xs"
                 >
                   Apply
                 </Button>
               </div>
             )}
 
             <div className="space-y-3">
               <Label className="text-sm font-medium">
                 Budget Range <span className="text-destructive">*</span>
               </Label>
               <p className="text-xs text-muted-foreground">
                 Enter your expected budget range. This helps freelancers understand your expectations.
               </p>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">Minimum</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                     <Input
                       type="text"
                       value={budgetMin}
                       onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                       placeholder="1,000"
                       className="pl-7 h-12 text-base rounded-xl"
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">Maximum</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                     <Input
                       type="text"
                       value={budgetMax}
                       onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                       placeholder="2,500"
                       className="pl-7 h-12 text-base rounded-xl"
                     />
                   </div>
                 </div>
               </div>
               {budgetError && (
                 <div className="flex items-center gap-2 text-destructive text-xs">
                   <AlertCircle className="h-3 w-3" />
                   {budgetError}
                 </div>
               )}
             </div>
 
             <div className="space-y-3">
               <Label className="text-sm font-medium flex items-center gap-2">
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 Timeline <span className="text-destructive">*</span>
               </Label>
               <p className="text-xs text-muted-foreground">
                 When do you need this project completed?
               </p>
               <Select value={timeline} onValueChange={setTimeline}>
                 <SelectTrigger className="w-full h-12 text-base rounded-xl">
                   <SelectValue placeholder="Select a Timeline..." />
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
            </div>

            {/* Step 4: Contact Information */}
            <div className="space-y-6 p-6 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Your Contact Info
                </h3>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 4 of 4</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll send project updates and freelancer proposals to your email.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Your Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-name"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    className="h-12 text-base rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 text-base rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="h-12 text-base rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg bg-gradient-primary shadow-primary-lg hover:shadow-xl transition-all"
                disabled={isSubmitting || !!budgetError}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                Post My Project — It's Free
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Free to post • No obligations • Get proposals in hours
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }