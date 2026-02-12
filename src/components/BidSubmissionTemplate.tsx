import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Percent, CreditCard, AlertCircle, DollarSign, Eye, Plus, Trash2, Milestone, Sparkles, Shield, Upload, X, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { AnonymizedDiggerCard } from "./AnonymizedDiggerCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Milestone interface
interface MilestoneItem {
  id: string;
  description: string;
  amount: string;
}

// Attachment (client-side only for now)
interface AttachmentFile {
  id: string;
  file: File;
  name: string;
}

const COVER_LETTER_MIN = 50;
const COVER_LETTER_MAX = 5000;
const TIMELINE_UNITS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
];
const CURRENCIES = [{ value: "USD", label: "USD ($)" }];

// SECURITY: Input validation schema
const bidSchema = z.object({
  amountMin: z.number()
    .positive("Minimum amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000"),
  amountMax: z.number()
    .positive("Maximum amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000"),
  timeline: z.string()
    .trim()
    .min(3, "Timeline must be at least 3 characters")
    .max(100, "Timeline must be less than 100 characters"),
  proposal: z.string()
    .trim()
    .min(50, "Proposal must be at least 50 characters")
    .max(5000, "Proposal must be less than 5000 characters"),
}).refine(data => data.amountMax >= data.amountMin, {
  message: "Maximum amount must be greater than or equal to minimum amount",
  path: ["amountMax"],
});

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.08; // 8% for exclusive
const REFERRAL_FEE_MIN = 50; // $50 minimum (no cap)
// Non-exclusive pricing for deposit calculation
const NON_EXCLUSIVE_RATE = 0.02; // 2%
const NON_EXCLUSIVE_MIN = 3; // $3 minimum
const NON_EXCLUSIVE_MAX = 49; // $49 maximum
// Deposit: higher of (5% + non-exclusive cost) or $249
const DEPOSIT_BASE_RATE = 0.05; // 5% base
const DEPOSIT_MIN = 249; // $249 minimum deposit

// Available payment methods
const PAYMENT_METHOD_OPTIONS = [
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer (ACH)" },
  { value: "check", label: "Check" },
  { value: "paypal", label: "PayPal" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Cryptocurrency" },
];

interface DiggerProfile {
  id: string;
  profession?: string;
  years_experience?: number;
  average_rating?: number;
  total_ratings?: number;
  completion_rate?: number;
  response_time_hours?: number;
  verified?: boolean;
  is_insured?: boolean;
  is_bonded?: boolean;
  is_licensed?: string;
  skills?: string[];
  certifications?: string[];
  city?: string;
  state?: string;
  offers_free_estimates?: boolean;
  profile_image_url?: string | null;
  business_name?: string;
}

interface BidSubmissionTemplateProps {
  gigId: string;
  diggerId: string;
  onSuccess: () => void;
  initialPricingModel?: "pay_per_lead" | "success_based";
}

export const BidSubmissionTemplate = ({ 
  gigId, 
  diggerId, 
  onSuccess, 
  initialPricingModel = "pay_per_lead" 
}: BidSubmissionTemplateProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [proposal, setProposal] = useState("");
  const [includesEscrowCost, setIncludesEscrowCost] = useState(false);
  const [pricingModel] = useState<"pay_per_lead" | "success_based">(initialPricingModel);
  const [diggerProfile, setDiggerProfile] = useState<DiggerProfile | null>(null);
  const [referenceCount, setReferenceCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  // New fields for milestones, payment methods, and payment terms
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  // UX: confirmation modal, timeline as number+unit, currency, attachments
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timelineNumber, setTimelineNumber] = useState("");
  const [timelineUnit, setTimelineUnit] = useState("weeks");
  const [currency, setCurrency] = useState("USD");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  // Fetch digger profile for preview
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('digger_profiles')
          .select(`
            id,
            profession,
            years_experience,
            average_rating,
            total_ratings,
            completion_rate,
            response_time_hours,
            verified,
            is_insured,
            is_bonded,
            is_licensed,
            skills,
            certifications,
            city,
            state,
            offers_free_estimates,
            profile_image_url,
            business_name
          `)
          .eq('id', diggerId)
          .single();

        if (profileError) throw profileError;
        setDiggerProfile(profile);

        // Count references
        const { count } = await supabase
          .from('references')
          .select('*', { count: 'exact', head: true })
          .eq('digger_id', diggerId)
          .eq('is_verified', true);

        setReferenceCount(count || 0);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [diggerId]);

  const calculateReferralFee = (amount: number): number => {
    const fee = amount * REFERRAL_FEE_RATE;
    return Math.max(REFERRAL_FEE_MIN, fee); // 8% with $50 minimum, no cap
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const timelineValue = timeline.trim() || (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : "");
    if (!amountMin || !amountMax || !timelineValue || !proposal) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const parsedMin = parseFloat(amountMin);
      const parsedMax = parseFloat(amountMax);
      const validated = bidSchema.parse({
        amountMin: parsedMin,
        amountMax: parsedMax,
        timeline: timelineValue,
        proposal: proposal,
      });

      // Calculate midpoint for the main amount field
      const midpointAmount = (validated.amountMin + validated.amountMax) / 2;

      // Prepare milestones data
      const milestonesData = milestones
        .filter(m => m.description.trim() && m.amount.trim())
        .map(m => ({
          description: m.description.trim(),
          amount: parseFloat(m.amount) || 0,
        }));

      const bidData: any = {
        gig_id: gigId,
        digger_id: diggerId,
        amount: midpointAmount,
        amount_min: validated.amountMin,
        amount_max: validated.amountMax,
        timeline: validated.timeline,
        proposal: validated.proposal,
        pricing_model: pricingModel,
        milestones: milestonesData.length > 0 ? milestonesData : null,
        accepted_payment_methods: acceptedPaymentMethods.length > 0 ? acceptedPaymentMethods : null,
        payment_terms: paymentTerms.trim() || null,
      };

      // Add referral fee info for success-based bids
      if (pricingModel === "success_based") {
        bidData.referral_fee_rate = REFERRAL_FEE_RATE;
        // No cap, just minimum
      }

      const { data: insertedBid, error } = await supabase
        .from('bids' as any)
        .insert(bidData)
        .select()
        .single();

      if (error) throw error;
      setConfirmOpen(false);

      // Send email notification
      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'submitted',
            bidId: (insertedBid as any)?.id,
            gigId,
            diggerId,
            amount: midpointAmount,
            amountMin: validated.amountMin,
            amountMax: validated.amountMax,
            timeline: validated.timeline,
            pricingModel,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      toast({
        title: "Proposal submitted!",
        description: pricingModel === "success_based"
          ? "Your proposal has been submitted. A 2% referral fee will be charged only if you're selected."
          : "Your proposal has been submitted successfully.",
      });

      // Track custom event
      const win = window as any;
      if (win.fbq) {
        try {
          win.fbq('trackCustom', 'SubmitBid', {
            bid_id: (insertedBid as any)?.id,
            gig_id: gigId,
            digger_id: diggerId,
            amount_min: validated.amountMin,
            amount_max: validated.amountMax,
            currency: 'USD',
            pricing_model: pricingModel,
          });
        } catch (error) {
          console.warn('Facebook Pixel: Error tracking SubmitBid event', error);
        }
      }

      setConfirmOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit proposal",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedMin = parseFloat(amountMin) || 0;
  const parsedMax = parseFloat(amountMax) || 0;
  const estimatedFeeMin = calculateReferralFee(parsedMin);
  const estimatedFeeMax = calculateReferralFee(parsedMax);

  // Build timeline string from number + unit for submission
  const timelineDisplay = timeline.trim() || (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : "");
  const effectiveTimeline = timeline.trim() || (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : timeline);

  // Real-time validation
  const validation = useMemo(() => {
    const err: Record<string, string> = {};
    if (!amountMin || parsedMin <= 0) err.amountMin = "Enter a valid minimum amount";
    if (!amountMax || parsedMax <= 0) err.amountMax = "Enter a valid maximum amount";
    if (parsedMax < parsedMin) err.amountMax = "Max must be ≥ min";
    if (proposal.length < COVER_LETTER_MIN) err.proposal = `Cover letter must be at least ${COVER_LETTER_MIN} characters`;
    if (proposal.length > COVER_LETTER_MAX) err.proposal = `Maximum ${COVER_LETTER_MAX} characters`;
    const hasTimeline = timeline.trim() || (timelineNumber && timelineUnit);
    if (!hasTimeline) err.timeline = "Select delivery time";
    return err;
  }, [amountMin, amountMax, parsedMin, parsedMax, proposal.length, timeline, timelineNumber, timelineUnit]);

  const isFormValid = Object.keys(validation).length === 0 && proposal.length >= COVER_LETTER_MIN && (timeline.trim() || (timelineNumber && timelineUnit));

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors(validation);
    if (!isFormValid) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  if (loadingProfile) {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Loading your profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              Your proposal will be sent to the client. You can’t edit it after submission. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit proposal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* Main column: form */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-xl">Submit your proposal</CardTitle>
                <CardDescription>
                  Complete the sections below. Required fields are marked.
                </CardDescription>
              </div>
            {pricingModel === "success_based" ? (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Percent className="w-3 h-3 mr-1" />
                Exclusive (Pay on Award)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CreditCard className="w-3 h-3 mr-1" />
                Non-Exclusive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pricingModel === "success_based" && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Exclusive Engagement Selected
                  </p>
                  <p className="text-orange-700 dark:text-orange-300">
                    You pay nothing upfront. An 8% referral fee (${REFERRAL_FEE_MIN} minimum) 
                    will be charged only if you're awarded and accept the job.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitClick} className="space-y-8 p-6">
            {/* A. Cover Letter */}
            <section className="space-y-3" aria-labelledby="cover-letter-heading">
              <h2 id="cover-letter-heading" className="text-lg font-semibold flex items-center gap-2">
                Cover letter
                <span className="text-destructive">*</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Introduce yourself and explain your approach. Why are you a good fit for this project?
              </p>
              <div className="relative">
                <Textarea
                  id="proposal"
                  aria-invalid={!!fieldErrors.proposal}
                  aria-describedby={fieldErrors.proposal ? "proposal-error" : "proposal-counter"}
                  placeholder="Describe your approach, relevant experience, and why you're the best fit. Be specific and professional..."
                  value={proposal}
                  onChange={(e) => { setProposal(e.target.value); setFieldErrors((prev) => ({ ...prev, proposal: "" })); }}
                  rows={10}
                  maxLength={COVER_LETTER_MAX}
                  className={cn(
                    "rounded-xl border-2 min-h-[200px] transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                    fieldErrors.proposal && "border-destructive"
                  )}
                />
                <div className="flex items-center justify-between mt-2">
                  <span id="proposal-counter" className="text-xs text-muted-foreground">
                    {proposal.length}/{COVER_LETTER_MAX} characters
                    {proposal.length >= COVER_LETTER_MIN && <CheckCircle2 className="inline-block w-3.5 h-3.5 text-green-600 ml-1" />}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary gap-1"
                    onClick={() => toast({ title: "Improve writing", description: "AI assist coming soon." })}
                  >
                    <Sparkles className="w-4 h-4" />
                    Improve writing
                  </Button>
                </div>
                {fieldErrors.proposal && (
                  <p id="proposal-error" className="text-sm text-destructive mt-1">{fieldErrors.proposal}</p>
                )}
              </div>
            </section>

            <Separator />

            {/* B. Bid Details */}
            <section className="space-y-4" aria-labelledby="bid-details-heading">
              <h2 id="bid-details-heading" className="text-lg font-semibold">Bid details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountMin">Minimum amount <span className="text-destructive">*</span></Label>
                  <Input
                    id="amountMin"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1,000"
                    value={amountMin}
                    onChange={(e) => { setAmountMin(e.target.value); setFieldErrors((prev) => ({ ...prev, amountMin: "", amountMax: "" })); }}
                    className={cn("rounded-xl", fieldErrors.amountMin && "border-destructive")}
                  />
                  {fieldErrors.amountMin && <p className="text-sm text-destructive">{fieldErrors.amountMin}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountMax">Maximum amount <span className="text-destructive">*</span></Label>
                  <Input
                    id="amountMax"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2,500"
                    value={amountMax}
                    onChange={(e) => { setAmountMax(e.target.value); setFieldErrors((prev) => ({ ...prev, amountMax: "" })); }}
                    className={cn("rounded-xl", fieldErrors.amountMax && "border-destructive")}
                  />
                  {fieldErrors.amountMax && <p className="text-sm text-destructive">{fieldErrors.amountMax}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delivery time <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="2"
                    value={timelineNumber}
                    onChange={(e) => { setTimelineNumber(e.target.value); setFieldErrors((prev) => ({ ...prev, timeline: "" })); }}
                    className={cn("w-24 rounded-xl", fieldErrors.timeline && "border-destructive")}
                  />
                  <Select value={timelineUnit} onValueChange={setTimelineUnit}>
                    <SelectTrigger className="w-32 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMELINE_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground self-center">or</span>
                  <Input
                    placeholder="e.g. 2-3 weeks"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="flex-1 min-w-[140px] rounded-xl"
                  />
                </div>
                {fieldErrors.timeline && <p className="text-sm text-destructive">{fieldErrors.timeline}</p>}
              </div>

              {/* Optional: milestone breakdown */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Milestone className="w-4 h-4" />
                    Milestone breakdown (optional)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMilestones([...milestones, { id: crypto.randomUUID(), description: "", amount: "" }])}
                    className="gap-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="flex gap-3 items-start p-3 bg-muted/30 rounded-xl border border-transparent">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder={`Milestone ${index + 1} description (e.g., "Design completion")`}
                      value={milestone.description}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].description = e.target.value;
                        setMilestones(updated);
                      }}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={milestone.amount}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].amount = e.target.value;
                        setMilestones(updated);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMilestones(milestones.filter(m => m.id !== milestone.id))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {milestones.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total milestones: ${milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toLocaleString()}
                </div>
              )}
              </div>
            </section>

            <Separator />

            {/* C. Attachments */}
            <section className="space-y-3" aria-labelledby="attachments-heading">
              <h2 id="attachments-heading" className="text-lg font-semibold">Attachments (optional)</h2>
              <div
                className={cn(
                  "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/20 hover:bg-muted/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = Array.from(e.dataTransfer.files);
                  files.forEach((file) => {
                    setAttachments((prev) => [...prev, { id: crypto.randomUUID(), file, name: file.name }]);
                  });
                }}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Drag and drop files here, or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, images, docs. Max 10MB per file.</p>
                <Input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    files.forEach((file) => setAttachments((prev) => [...prev, { id: crypto.randomUUID(), file, name: file.name }]));
                    e.target.value = "";
                  }}
                />
                <Label htmlFor="file-upload" className="cursor-pointer text-primary text-sm font-medium hover:underline mt-2 inline-block">
                  Choose files
                </Label>
              </div>
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                      <span className="truncate">{a.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Separator />

            {/* Payment methods & terms (compact) */}
            <section className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Accepted payment methods
              </Label>
              <p className="text-sm text-muted-foreground">
                Select the payment methods you accept for this project.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      acceptedPaymentMethods.includes(method.value)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={acceptedPaymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAcceptedPaymentMethods([...acceptedPaymentMethods, method.value]);
                        } else {
                          setAcceptedPaymentMethods(acceptedPaymentMethods.filter(v => v !== method.value));
                        }
                      }}
                    />
                    <span className="text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms" className="text-base font-semibold">
                Payment Terms
              </Label>
              <Textarea
                id="paymentTerms"
                placeholder="Describe your payment terms (e.g., 50% upfront, 50% on completion; Net 30; etc.)"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {paymentTerms.length}/1000 characters
              </p>
            </div>

            {pricingModel === "pay_per_lead" && (
              <div className="space-y-3 pt-2 pb-2">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includesEscrowCost"
                    checked={includesEscrowCost}
                    onCheckedChange={(checked) => setIncludesEscrowCost(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="includesEscrowCost" className="cursor-pointer leading-relaxed">
                      My proposal includes escrow costs (if applicable)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="inline-block h-3 w-3 mr-1" />
                      If the client requests escrow protection, an 8% fee will apply. Check this if you've added that cost to your price range.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Preview Toggle */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide Preview" : "Preview How Client Sees You"}
              </Button>
            </div>

            {/* Preview of Anonymized Profile */}
            {showPreview && diggerProfile && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  This is how your proposal will appear to the client (your identity is hidden):
                </p>
                <AnonymizedDiggerCard
                  bidderNumber={1}
                  profession={diggerProfile.profession}
                  yearsExperience={diggerProfile.years_experience}
                  averageRating={diggerProfile.average_rating}
                  totalRatings={diggerProfile.total_ratings}
                  completionRate={diggerProfile.completion_rate}
                  responseTimeHours={diggerProfile.response_time_hours}
                  isVerified={diggerProfile.verified}
                  isInsured={diggerProfile.is_insured}
                  isBonded={diggerProfile.is_bonded}
                  isLicensed={diggerProfile.is_licensed}
                  skills={diggerProfile.skills}
                  certifications={diggerProfile.certifications}
                  referenceCount={referenceCount}
                  city={diggerProfile.city}
                  state={diggerProfile.state}
                  offersFreeBEstimates={diggerProfile.offers_free_estimates}
                />
                
                {/* Sample Cost Display */}
                {parsedMin > 0 && parsedMax > 0 && (
                  <div className="p-4 bg-accent/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Proposed Cost Range:</span>
                      <span className="text-xl font-bold text-primary">
                        ${parsedMin.toLocaleString()} – ${parsedMax.toLocaleString()}
                      </span>
                    </div>
                    {timeline && (
                      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                        <span>Timeline:</span>
                        <span>{timeline}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl h-12 font-semibold shadow-sm"
              disabled={!isFormValid || loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                  Submitting...
                </>
              ) : (
                "Submit proposal"
              )}
            </Button>

            {pricingModel === "success_based" && (
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to pay an 8% referral fee (${REFERRAL_FEE_MIN} minimum) if you're awarded and accept this job.
              </p>
            )}
          </form>
        </CardContent>
        </Card>

        {/* Sidebar: freelancer details + summary + trust */}
        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          {/* D. Freelancer profile preview */}
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Your profile</CardTitle>
              <CardDescription>This is what the client will see with your proposal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {diggerProfile && (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 rounded-xl border-2 border-muted">
                      <AvatarImage src={diggerProfile.profile_image_url || undefined} alt="" />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
                        {(diggerProfile.business_name || "D").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{diggerProfile.business_name || "Digger"}</p>
                      <p className="text-sm text-muted-foreground">{diggerProfile.profession || "Professional"}</p>
                      {typeof diggerProfile.average_rating === "number" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-foreground">{diggerProfile.average_rating.toFixed(1)}</span>
                          <span>· {diggerProfile.total_ratings ?? 0} reviews</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {typeof diggerProfile.completion_rate === "number" && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Completion</p>
                        <p className="font-semibold">{diggerProfile.completion_rate}%</p>
                      </div>
                    )}
                    {referenceCount > 0 && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">References</p>
                        <p className="font-semibold">{referenceCount}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing breakdown & trust */}
          <Card className="rounded-2xl border bg-muted/20">
            <CardContent className="pt-6 space-y-4">
              {parsedMin > 0 && parsedMax > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Your bid range</p>
                  <p className="text-xl font-bold text-primary">
                    ${parsedMin.toLocaleString()} – ${parsedMax.toLocaleString()}
                  </p>
                  {pricingModel === "success_based" && (
                    <p className="text-xs text-muted-foreground">
                      If awarded: 8% referral fee (min ${REFERRAL_FEE_MIN})
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Shield className="w-4 h-4 shrink-0 text-primary/70" />
                <span>Your proposal is secure and encrypted.</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
};
