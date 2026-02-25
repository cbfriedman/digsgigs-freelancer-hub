import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Percent, CreditCard, DollarSign, Plus, Trash2, Milestone, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { getLeadPriceDisplay, LEAD_PRICE_CAPTION } from "@/lib/leadPrice";

// Milestone interface
interface MilestoneItem {
  id: string;
  description: string;
  amount: string;
}

const COVER_LETTER_MIN = 50;
const COVER_LETTER_MAX = 5000;
const TIMELINE_UNITS = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
];
// SECURITY: Input validation schema - single bid amount (no range)
const bidSchema = z.object({
  amount: z.number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000"),
  timeline: z.string()
    .trim()
    .min(3, "Timeline must be at least 3 characters")
    .max(100, "Timeline must be less than 100 characters"),
  proposal: z.string()
    .trim()
    .min(50, "Proposal must be at least 50 characters")
    .max(5000, "Proposal must be less than 5000 characters"),
});

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.08; // 8% for exclusive
const REFERRAL_FEE_MIN = 99; // $99 minimum (no cap)
// Lead price uses shared 8% of budget $3–$49 (see @/lib/leadPrice)
// Deposit: higher of (5% + non-exclusive cost) or $249
const DEPOSIT_BASE_RATE = 0.05; // 5% base
const DEPOSIT_MIN = 249; // $249 minimum deposit

/** When provided, the form is in edit mode: pre-filled and submit updates the bid instead of inserting. */
export interface ExistingBidForEdit {
  id: string;
  proposal: string;
  amount: number;
  amount_min?: number | null;
  amount_max?: number | null;
  timeline: string;
  milestones?: { description: string; amount: number }[] | null;
  pricing_model?: "pay_per_lead" | "success_based" | null;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  /** Not shown in form anymore; kept for API compatibility */
  payment_terms?: string | null;
  accepted_payment_methods?: string[] | null;
}

interface BidSubmissionTemplateProps {
  gigId: string;
  diggerId: string;
  onSuccess: () => void;
  initialPricingModel?: "pay_per_lead" | "success_based";
  existingBid?: ExistingBidForEdit | null;
  /** When set, clicking "Buy the lead" navigates to payment (e.g. lead unlock). After payment the Digger sees contact info. */
  onBuyLeadClick?: () => void;
  /** When set, clicking "Exclusive" scrolls to the proposal form (e.g. #bid). */
  onExclusiveClick?: () => void;
  /** Pass gig budget so "Buy the lead" shows the same price as elsewhere on the site. */
  leadPriceBudgetMin?: number | null;
  leadPriceBudgetMax?: number | null;
  leadPriceCalculatedCents?: number | null;
  /** When "hourly", show hourly rate + estimated hours and store amount = rate * hours. */
  projectType?: "fixed" | "hourly" | null;
}

export const BidSubmissionTemplate = ({ 
  gigId, 
  diggerId, 
  onSuccess, 
  initialPricingModel = "pay_per_lead",
  existingBid = null,
  onBuyLeadClick,
  onExclusiveClick,
  leadPriceBudgetMin,
  leadPriceBudgetMax,
  leadPriceCalculatedCents,
  projectType = "fixed",
}: BidSubmissionTemplateProps) => {
  const isHourlyGig = projectType === "hourly";
  const isEditMode = !!existingBid?.id;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [timeline, setTimeline] = useState("");
  const [proposal, setProposal] = useState("");
  const [pricingModel, setPricingModel] = useState<"pay_per_lead" | "success_based">(
    existingBid?.pricing_model === "success_based"
      ? "success_based"
      : existingBid?.pricing_model === "pay_per_lead"
        ? "pay_per_lead"
        : (onBuyLeadClick ? "success_based" : initialPricingModel)
  );
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timelineNumber, setTimelineNumber] = useState("");
  const [timelineUnit, setTimelineUnit] = useState("weeks");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing an existing bid (single amount: use amount or derive from min/max; or hourly rate/hours)
  useEffect(() => {
    if (!existingBid?.id) return;
    const existing = existingBid as ExistingBidForEdit & { hourly_rate?: number | null; estimated_hours?: number | null };
    if (existing.hourly_rate != null) {
      setHourlyRate(String(existing.hourly_rate));
      setEstimatedHours(existing.estimated_hours != null ? String(existing.estimated_hours) : "");
      setAmount(existing.amount != null ? String(existing.amount) : "");
    } else {
      const initialAmount = existingBid.amount ?? (existingBid.amount_min != null && existingBid.amount_max != null
        ? (existingBid.amount_min + existingBid.amount_max) / 2
        : existingBid.amount_min ?? existingBid.amount_max ?? 0);
      setAmount(initialAmount ? String(initialAmount) : "");
    }
    const tl = existingBid.timeline || "";
    setTimeline(tl);
    const match = tl.match(/^(\d+)\s+(hours?|days?|weeks?|months?)$/i);
    if (match) {
      setTimelineNumber(match[1]);
      const u = match[2].toLowerCase();
      setTimelineUnit(u === "hour" ? "hours" : u === "day" ? "days" : u === "week" ? "weeks" : u === "month" ? "months" : u);
    }
    setProposal(existingBid.proposal || "");
    if (existingBid.pricing_model === "success_based" || existingBid.pricing_model === "pay_per_lead") {
      setPricingModel(existingBid.pricing_model);
    }
    if (Array.isArray(existingBid.milestones) && existingBid.milestones.length > 0) {
      setMilestones(
        existingBid.milestones.map((m) => ({
          id: crypto.randomUUID(),
          description: m.description || "",
          amount: m.amount != null ? String(m.amount) : "",
        }))
      );
    }
  }, [existingBid?.id]);

  const calculateReferralFee = (amount: number): number => {
    const fee = amount * REFERRAL_FEE_RATE;
    return Math.max(REFERRAL_FEE_MIN, fee); // 8% with $99 minimum, no cap
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const timelineValue = (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : "") || timeline.trim();
    if (isHourlyGig) {
      if (!hourlyRate.trim() || parseFloat(hourlyRate) <= 0 || !timelineValue || !proposal) {
        toast({ title: "Missing fields", description: "Enter hourly rate, timeline, and proposal.", variant: "destructive" });
        return;
      }
    } else if (!amount || !timelineValue || !proposal) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const parsedAmount = isHourlyGig
        ? parseFloat(hourlyRate) * (estimatedHours.trim() ? parseFloat(estimatedHours) : 1)
        : parseFloat(amount);
      const validated = bidSchema.parse({
        amount: parsedAmount,
        timeline: timelineValue,
        proposal: proposal,
      });

      // Prepare milestones data
      const milestonesData = milestones
        .filter(m => m.description.trim() && m.amount.trim())
        .map(m => ({
          description: m.description.trim(),
          amount: parseFloat(m.amount) || 0,
        }));

      const bidData: any = {
        amount: validated.amount,
        amount_min: null,
        amount_max: null,
        timeline: validated.timeline,
        proposal: validated.proposal,
        milestones: milestonesData.length > 0 ? milestonesData : null,
        updated_at: new Date().toISOString(),
      };
      if (isHourlyGig) {
        bidData.hourly_rate = parseFloat(hourlyRate);
        bidData.estimated_hours = estimatedHours.trim() ? parseFloat(estimatedHours) : null;
      }

      if (isEditMode && existingBid?.id) {
        bidData.pricing_model = pricingModel;
        if (pricingModel === "success_based") bidData.referral_fee_rate = REFERRAL_FEE_RATE;
        const { error } = await supabase
          .from('bids' as any)
          .update(bidData)
          .eq('id', existingBid.id);

        if (error) throw error;
        setConfirmOpen(false);
        toast({ title: "Proposal updated", description: "Your changes have been saved." });
        onSuccess();
        return;
      }

      bidData.gig_id = gigId;
      bidData.digger_id = diggerId;
      bidData.pricing_model = pricingModel;
      if (pricingModel === "success_based") bidData.referral_fee_rate = REFERRAL_FEE_RATE;

      const { data: insertedBid, error } = await supabase
        .from('bids' as any)
        .insert(bidData)
        .select()
        .single();

      if (error) throw error;
      setConfirmOpen(false);

      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'submitted',
            bidId: (insertedBid as any)?.id,
            gigId,
            diggerId,
            amount: validated.amount,
            timeline: validated.timeline,
            pricingModel,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      const win = window as any;
      if (win.fbq) {
        try {
          win.fbq('trackCustom', 'SubmitBid', {
            bid_id: (insertedBid as any)?.id,
            gig_id: gigId,
            digger_id: diggerId,
            amount: validated.amount,
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

  const effectiveAmount = isHourlyGig
    ? (parseFloat(hourlyRate) || 0) * (estimatedHours.trim() ? parseFloat(estimatedHours) : 1)
    : parseFloat(amount) || 0;
  const parsedAmount = effectiveAmount;
  const estimatedFee = calculateReferralFee(parsedAmount);

  // Build timeline string from number + unit for submission
  const timelineDisplay = (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : "") || timeline.trim();
  const effectiveTimeline = (timelineNumber && timelineUnit ? `${timelineNumber} ${timelineUnit}` : "") || timeline.trim() || timeline;

  // Real-time validation
  const validation = useMemo(() => {
    const err: Record<string, string> = {};
    if (isHourlyGig) {
      const rate = parseFloat(hourlyRate);
      if (!hourlyRate.trim() || isNaN(rate) || rate <= 0) err.amount = "Enter a valid hourly rate ($/hr)";
    } else if (!amount || parseFloat(amount) <= 0) err.amount = "Enter a valid bid amount";
    if (proposal.length < COVER_LETTER_MIN) err.proposal = `Cover letter must be at least ${COVER_LETTER_MIN} characters`;
    if (proposal.length > COVER_LETTER_MAX) err.proposal = `Maximum ${COVER_LETTER_MAX} characters`;
    const hasTimeline = (timelineNumber && timelineUnit) || timeline.trim();
    if (!hasTimeline) err.timeline = "Select delivery time";
    return err;
  }, [isHourlyGig, amount, hourlyRate, estimatedHours, proposal.length, timeline, timelineNumber, timelineUnit]);

  const isFormValid = Object.keys(validation).length === 0 && proposal.length >= COVER_LETTER_MIN && ((timelineNumber && timelineUnit) || timeline.trim());

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors(validation);
    if (!isFormValid) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }
    if (isEditMode) {
      handleSubmit(e);
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      {!isEditMode && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="rounded-2xl shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Submit your proposal?</AlertDialogTitle>
              <AlertDialogDescription>
                Your proposal will be sent to the client. You can edit it later from this page. Continue?
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
      )}
      <div dir="ltr" className="w-full min-w-0 max-w-full">
        <Card className="rounded-2xl border shadow-sm overflow-hidden min-w-0">
          <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
              <div>
                <CardTitle className="text-xl">{isEditMode ? "Edit your proposal" : "Submit your proposal"}</CardTitle>
                <CardDescription>
                  {isEditMode ? "Update your details below. Changes are saved for the client to review." : "Complete the sections below. Required fields are marked."}
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
                Buy the lead
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {/* Digger chooses: Buy the lead vs Exclusive (when onBuyLeadClick not set) */}
          {!onBuyLeadClick && (
          <section className="mb-6 space-y-3" aria-labelledby="pricing-type-heading">
            <h2 id="pricing-type-heading" className="text-lg font-semibold">
              What would you like to do with this lead?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPricingModel("pay_per_lead")}
                className={cn(
                  "flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-colors cursor-pointer",
                  pricingModel === "pay_per_lead"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Buy the lead</span>
                </div>
                <div className="text-base font-semibold text-primary">
                  {getLeadPriceDisplay(leadPriceBudgetMin, leadPriceBudgetMax, leadPriceCalculatedCents).label}
                </div>
                <p className="text-sm text-muted-foreground">
                  {LEAD_PRICE_CAPTION} Client awards with no upfront deposit. You get paid per milestone when they approve—funds are held by the platform until then.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingModel("success_based");
                  onExclusiveClick?.();
                }}
                className={cn(
                  "flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-colors cursor-pointer",
                  pricingModel === "success_based"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 ring-2 ring-orange-500/30"
                    : "border-border hover:border-orange-500/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold">Exclusive (Pay on Award)</span>
                </div>
                {parsedAmount > 0 && (
                  <div className="text-base font-semibold text-orange-600 dark:text-orange-400">
                    Referral fee when awarded: ${Math.max(REFERRAL_FEE_MIN, Math.round(parsedAmount * REFERRAL_FEE_RATE)).toLocaleString()} (8%, ${REFERRAL_FEE_MIN} min)
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Client pays 15% deposit to award you. The 8% referral fee (${REFERRAL_FEE_MIN} min) comes from their deposit—not your pocket. You must accept within 24 hours or you&apos;ll be charged a $100 penalty. If you decline, you&apos;ll be charged a $100 penalty.
                </p>
              </button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              You&apos;re paid when the client approves each milestone. Funds are held by the platform until then.
            </p>
          </section>
          )}

          <form onSubmit={handleSubmitClick} className="space-y-6 sm:space-y-8 p-4 sm:p-6">
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
                  rows={8}
                  maxLength={COVER_LETTER_MAX}
                  className={cn(
                    "rounded-xl border-2 min-h-[160px] sm:min-h-[200px] transition-colors focus-visible:ring-2 focus-visible:ring-primary text-base",
                    fieldErrors.proposal && "border-destructive"
                  )}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
                  <span id="proposal-counter" className="text-xs text-muted-foreground">
                    {proposal.length}/{COVER_LETTER_MAX} characters
                    {proposal.length >= COVER_LETTER_MIN && <CheckCircle2 className="inline-block w-3.5 h-3.5 text-green-600 ml-1" />}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary gap-1 w-fit"
                    onClick={() => toast({ title: "Improve writing", description: "AI assist coming soon." })}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">Improve writing</span>
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
              {isHourlyGig ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly rate ($/hr) <span className="text-destructive">*</span></Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="5"
                      min="0"
                      placeholder="e.g. 75"
                      value={hourlyRate}
                      onChange={(e) => { setHourlyRate(e.target.value); setFieldErrors((prev) => ({ ...prev, amount: "" })); }}
                      className={cn("rounded-xl max-w-xs", fieldErrors.amount && "border-destructive")}
                    />
                    {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Estimated hours <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 20"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className="rounded-xl max-w-xs"
                    />
                    {parsedAmount > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Estimated total: <strong className="text-foreground">${Math.round(parsedAmount).toLocaleString()}</strong>
                        {pricingModel === "success_based" && ` · 8% referral fee (from client deposit, not you): $${estimatedFee.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="amount">Your bid amount (USD) <span className="text-destructive">*</span></Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 1,500"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setFieldErrors((prev) => ({ ...prev, amount: "" })); }}
                    className={cn("rounded-xl max-w-xs", fieldErrors.amount && "border-destructive")}
                  />
                  {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
                  {pricingModel === "success_based" && parsedAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      8% referral fee (from client deposit, not you): ${estimatedFee.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Delivery time <span className="text-destructive">*</span></Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="2"
                      value={timelineNumber}
                      onChange={(e) => { setTimelineNumber(e.target.value); setFieldErrors((prev) => ({ ...prev, timeline: "" })); }}
                      className={cn("w-20 sm:w-24 rounded-xl shrink-0", fieldErrors.timeline && "border-destructive")}
                    />
                    <Select value={timelineUnit} onValueChange={setTimelineUnit}>
                      <SelectTrigger className="w-28 sm:w-32 rounded-xl shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {fieldErrors.timeline && <p className="text-sm text-destructive">{fieldErrors.timeline}</p>}
              </div>

              {/* Optional: milestone breakdown */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Milestone className="w-4 h-4" />
                      Milestone breakdown
                    </Label>
                  </div>
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
                <div key={milestone.id} className="flex flex-col gap-3 sm:flex-row sm:gap-3 sm:items-start p-3 bg-muted/30 rounded-xl border border-transparent">
                  <div className="flex-1 min-w-0 space-y-2 w-full sm:w-auto">
                    <Input
                      placeholder={`Milestone ${index + 1} description (e.g., "Design completion")`}
                      value={milestone.description}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].description = e.target.value;
                        setMilestones(updated);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-3 items-center">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={milestone.amount}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].amount = e.target.value;
                        setMilestones(updated);
                      }}
                      className="w-28 sm:w-28 shrink-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setMilestones(milestones.filter(m => m.id !== milestone.id))}
                      className="text-destructive hover:text-destructive shrink-0 h-10 w-10"
                      aria-label="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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

            <Button
              type="submit"
              className="w-full rounded-xl h-12 min-h-[48px] font-semibold shadow-sm touch-manipulation"
              disabled={!isFormValid || loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                  {isEditMode ? "Saving..." : "Submitting..."}
                </>
              ) : isEditMode ? (
                "Update proposal"
              ) : (
                "Submit proposal"
              )}
            </Button>

            {pricingModel === "success_based" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">No fee from your pocket</AlertTitle>
                <AlertDescription>
                  <span className="block">Gigger awards → Gigger pays a 15% deposit (charged to their card).</span>
                  <span className="block mt-1">Digger accepts → The 8% referral fee is taken from that deposit: the platform keeps 8%, the rest is released to you. You are not charged anything.</span>
                  <span className="block mt-1">First milestone approved → 7% is added to you from that deposit when you complete the first milestone (no extra charge to you).</span>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        </Card>
      </div>
    </>
  );
};
