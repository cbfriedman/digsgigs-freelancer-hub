import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { Loader2, Plus, Trash2, CreditCard, Shield, Info, AlertCircle, RefreshCw } from "lucide-react";

// Fee rule: Gross = milestone amount. 8% platform fee paid by Digger (deducted from payout). 3% transaction fee paid by Gigger.
const PLATFORM_FEE_PERCENT = 8; // Digger: net = gross - 8%
const TRANSACTION_FEE_PERCENT = 3; // Gigger: total = gross + 3%

interface Milestone {
  description: string;
  amount: number;
}

const DEPOSIT_RATE = 0.15; // 15% deposit for exclusive gigs

interface PaymentContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  bidId: string;
  bidAmount: number;
  gigTitle: string;
  /** If success_based, milestone budget = bid - 15% deposit */
  pricingModel?: string | null;
  /** Pre-fill from Digger's suggested plan (when gigger accepts). */
  suggestedMilestones?: { description: string; amount: number }[] | null;
  /** For hourly bids: pre-fill first milestone description as "Estimated total (X hrs @ $Y/hr)". */
  hourlyRate?: number | null;
  estimatedHours?: number | null;
  onComplete?: () => void;
}

export function PaymentContractDialog({
  open,
  onOpenChange,
  gigId,
  bidId,
  bidAmount,
  gigTitle,
  pricingModel,
  suggestedMilestones,
  hourlyRate,
  estimatedHours,
  onComplete,
}: PaymentContractDialogProps) {
  const { toast } = useToast();
  const isExclusive = pricingModel === "success_based";
  // Contract amount = bid - 15% deposit for exclusive gigs; otherwise full bid
  const contractAmount = isExclusive
    ? Math.round(bidAmount * (1 - DEPOSIT_RATE) * 100) / 100
    : bidAmount;

  const hourlyDescription =
    hourlyRate != null && hourlyRate > 0 && estimatedHours != null && estimatedHours > 0
      ? `Estimated total (${Number(estimatedHours)} hrs @ $${Math.round(hourlyRate)}/hr)`
      : null;

  const [loading, setLoading] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [diggerEligibility, setDiggerEligibility] = useState<
    null | "ok" | "digger_payouts_not_set_up" | "digger_payouts_pending_verification"
  >(null);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  /** Milestone total = contract amount (bid minus 15% deposit for exclusive gigs). */
  const [milestoneTotal, setMilestoneTotal] = useState<number>(contractAmount);
  const [milestones, setMilestones] = useState<Milestone[]>(() =>
    hourlyDescription && (!suggestedMilestones || suggestedMilestones.length === 0)
      ? [{ description: hourlyDescription, amount: contractAmount }]
      : [{ description: "", amount: contractAmount }]
  );

  const fetchEligibility = useCallback(async () => {
    setCheckingEligibility(true);
    try {
      const [paymentData, eligibilityData] = await Promise.all([
        invokeEdgeFunction<{ paymentMethods?: unknown[] }>(
          supabase,
          "manage-payment-methods",
          { method: "GET" }
        ).catch(() => ({ paymentMethods: [] })),
        invokeEdgeFunction<{ eligible?: boolean; reason?: string; milestoneTotal?: number }>(supabase, "check-payment-contract-eligibility", {
          body: { gigId, bidId },
        }).catch(() => ({ eligible: false, reason: "unknown" })),
      ]);
      setHasPaymentMethod((paymentData?.paymentMethods?.length ?? 0) > 0);
      const apiMt = typeof eligibilityData?.milestoneTotal === "number" ? eligibilityData.milestoneTotal : null;
      // For exclusive gigs: contract amount is always bid - 15%; use API value only if it matches (avoids API returning full bid when deposit not in DB)
      const mt =
        isExclusive
          ? (apiMt != null && apiMt < bidAmount ? apiMt : contractAmount)
          : (apiMt ?? contractAmount);
      setMilestoneTotal(mt);
      // Don't overwrite milestones when the gigger opened with a suggested plan (keep the pre-filled form)
      if (!suggestedMilestones || suggestedMilestones.length === 0) {
        setMilestones((prev) => [{ description: prev[0]?.description ?? "", amount: mt }]);
      }
      if (eligibilityData?.eligible) {
        setDiggerEligibility("ok");
      } else if (eligibilityData?.reason === "digger_payouts_pending_verification") {
        setDiggerEligibility("digger_payouts_pending_verification");
      } else if (eligibilityData?.reason === "digger_payouts_not_set_up") {
        setDiggerEligibility("digger_payouts_not_set_up");
      } else {
        setDiggerEligibility("ok");
      }
    } catch {
      setHasPaymentMethod(false);
      setDiggerEligibility(null);
    } finally {
      setCheckingEligibility(false);
    }
  }, [gigId, bidId, contractAmount, isExclusive, bidAmount, suggestedMilestones]);

  const isHourly = (hourlyRate ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    const suggested = suggestedMilestones && Array.isArray(suggestedMilestones) && suggestedMilestones.length > 0;
    if (suggested) {
      const total = suggestedMilestones!.reduce((s, m) => s + (m.amount ?? 0), 0);
      setMilestoneTotal(total);
      setMilestones(suggestedMilestones!.map((m) => ({ description: m.description ?? "", amount: m.amount ?? 0 })));
    } else {
      setMilestoneTotal(contractAmount);
      setMilestones(
        hourlyDescription
          ? [{ description: hourlyDescription, amount: contractAmount }]
          : [{ description: "", amount: contractAmount }]
      );
    }
    fetchEligibility();
  }, [open, bidId, contractAmount, fetchEligibility, suggestedMilestones, hourlyDescription]);

  const addMilestone = () => {
    const sumExisting = milestones.reduce((s, m) => s + (m.amount || 0), 0);
    const remainder = Math.max(0, milestoneTotal - sumExisting);
    setMilestones([...milestones, { description: "", amount: remainder }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    // When any non-last milestone amount changes, auto-fill last with remaining budget
    if (field === "amount" && index < milestones.length - 1 && milestones.length >= 2) {
      const amount = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      const sumOthers = updated
        .map((m, i) => (i === index ? amount : m.amount || 0))
        .slice(0, -1)
        .reduce((s, a) => s + a, 0);
      const lastIdx = updated.length - 1;
      updated[lastIdx] = { ...updated[lastIdx], amount: Math.max(0, milestoneTotal - sumOthers) };
    }
    setMilestones(updated);
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  const handleCreateContract = async () => {
    if (milestones.some((m) => !m.description?.trim() || (m.amount ?? 0) <= 0)) {
      toast({
        title: "Invalid milestones",
        description: "Each milestone needs a description and amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    if (Math.abs(totalMilestoneAmount - milestoneTotal) > 0.01) {
      toast({
        title: "Amount mismatch",
        description: `Milestone total ($${totalMilestoneAmount.toFixed(2)}) must equal contract amount ($${milestoneTotal.toFixed(2)}${milestoneTotal !== bidAmount ? " = bid minus 15% deposit" : ""}).`,
        variant: "destructive",
      });
      return;
    }

    // Ensure last milestone amount equals remaining budget (sum of all = contract amount)
    const milestonesToSend =
      milestones.length >= 2
        ? milestones.map((m, i) =>
            i === milestones.length - 1
              ? {
                  ...m,
                  amount: Math.round((milestoneTotal - milestones.slice(0, -1).reduce((s, x) => s + (x.amount || 0), 0)) * 100) / 100,
                }
              : m
          )
        : milestones;

    setLoading(true);
    try {
      await invokeEdgeFunction(supabase, "create-payment-contract", {
        body: { gigId, bidId, milestones: milestonesToSend },
      });
      toast({
        title: "Contract created",
        description:
          "When the Digger submits a milestone, you’ll see “Approve & pay” on this gig. You’re only charged when you approve. Payments are secure (Stripe).",
      });
      onOpenChange(false);
      onComplete?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create contract";
      if (message.toLowerCase().includes("payment method")) {
        setHasPaymentMethod(false);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 border border-border rounded-lg">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 flex-wrap">
            Set up payment contract
            {isHourly && (
              <Badge variant="secondary" className="font-normal text-xs">
                Hourly · ${Math.round(hourlyRate ?? 0)}/hr
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isHourly && (
              <span className="block mb-1">
                Pay per time period. First payment = estimated total; add more from the gig page later. You pay only when you approve.
              </span>
            )}
            <span className="block">
              All payments go through our platform—secure and reliable. Funds are held by the platform until you approve each milestone. You pay a <strong>3% transaction fee</strong> per milestone when you approve (Gigger total = milestone + 3%). The Digger receives the milestone amount minus an <strong>8% platform fee</strong> (paid by Digger). No upfront charge; you pay only when you’re satisfied with the work.
            </span>
            <span className="block text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Set milestones → Digger delivers → You click “Approve & pay” to charge and pay.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggestedMilestones && suggestedMilestones.length > 0 && (
            <Alert className="border border-border rounded-lg bg-muted/30 shadow-none">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-sm">
                The Digger suggested the milestone plan below. You can edit any description or amount.
              </AlertDescription>
            </Alert>
          )}
          {diggerEligibility === "digger_payouts_not_set_up" && (
            <Alert variant="destructive" className="border border-border rounded-lg bg-destructive/5 shadow-none">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  The Digger has not set up payouts yet. Ask them to complete Stripe Connect onboarding so you can
                  create the contract. They can do this under <strong>My Bids</strong> or <strong>Settings → Get
                  paid</strong>.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchEligibility}
                  disabled={checkingEligibility}
                >
                  {checkingEligibility ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Check again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {diggerEligibility === "digger_payouts_pending_verification" && (
            <Alert variant="destructive" className="border border-border rounded-lg bg-destructive/5 shadow-none">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  The Digger’s payout account is still being verified. Ask them to finish the payout setup in their
                  account; it usually takes a few minutes. Then you can create the contract.
                </p>
                <p className="text-xs text-muted-foreground">
                  If the Digger has already finished (e.g. Stripe shows them as Enabled), click below to refresh—our system may have just updated.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchEligibility}
                  disabled={checkingEligibility}
                >
                  {checkingEligibility ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Check again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {hasPaymentMethod === false && (
            <Alert className="border border-border rounded-lg bg-muted/30 shadow-none">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  No saved payment method. You can still create the contract. You’ll pay via Stripe Checkout when you approve each milestone.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="shrink-0">
                        Add payment method (optional)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add payment method</DialogTitle>
                        <DialogDescription>
                          Your card is stored securely by Stripe. You’re only charged when you approve a milestone. You can also manage cards in Settings.
                        </DialogDescription>
                      </DialogHeader>
                      <PaymentMethodForm
                        onSuccess={() => {
                          setShowAddPaymentDialog(false);
                          setHasPaymentMethod(true);
                          toast({ title: "Payment method added", description: "You can now create the contract." });
                        }}
                        onCancel={() => setShowAddPaymentDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  <span className="text-muted-foreground text-xs">or</span>
                  <Button size="sm" variant="ghost" className="shrink-0 h-auto py-1 px-2 text-xs font-medium" asChild>
                    <Link to="/payment-methods" onClick={() => onOpenChange(false)}>
                      Open Payment methods in Settings
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label className="text-sm font-medium">Project</Label>
            <Input value={gigTitle} disabled className="border-border bg-muted/30 h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-sm font-medium">{isHourly ? "Estimated total (first payment)" : "Contract amount (milestone budget)"}</Label>
            <Input value={`$${milestoneTotal.toFixed(2)}`} disabled className="border-border bg-muted/30 h-9" />
            {isHourly && (
              <p className="text-xs text-muted-foreground">
                {estimatedHours != null && estimatedHours > 0
                  ? `${Number(estimatedHours)} hrs × $${Math.round(hourlyRate ?? 0)}/hr = $${milestoneTotal.toFixed(2)}. `
                  : `Agreed rate $${Math.round(hourlyRate ?? 0)}/hr. `}
                You can add more time-period milestones from the gig page after creating the contract.
              </p>
            )}
            {!isHourly && milestoneTotal !== bidAmount ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Bid ${bidAmount.toFixed(2)} − 15% deposit (paid at award) = ${milestoneTotal.toFixed(2)}. The total of all milestone amounts must equal this.
                </p>
                <p>
                  <strong>7% of the deposit</strong> is transferred to the Digger when the first milestone is completed (from the 15% deposit; no extra charge).
                </p>
              </div>
            ) : !isHourly ? (
              <p className="text-xs text-muted-foreground">
                The total of all milestone amounts must equal the contract amount.
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-sm font-medium">{isHourly ? "First payment (estimated total)" : "Milestones"}</Label>
                {isHourly && milestones.length <= 1 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Add more time periods later from the gig page.</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                disabled={loading}
                className="border-border"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add milestone
              </Button>
            </div>

            {milestones.map((m, index) => (
              <div
                key={index}
                className="flex gap-2 items-start border border-border rounded-lg p-3 bg-muted/20"
              >
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="e.g. First draft delivered"
                      value={m.description}
                      onChange={(e) => updateMilestone(index, "description", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Amount ($)
                      {milestones.length >= 2 && index === milestones.length - 1 && (
                        <span className="text-muted-foreground font-normal ml-1">(remaining budget)</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={
                        milestones.length >= 2 && index === milestones.length - 1
                          ? Math.max(
                              0,
                              milestoneTotal -
                                milestones
                                  .slice(0, -1)
                                  .reduce((s, x) => s + (x.amount || 0), 0)
                            ).toFixed(2)
                          : m.amount || ""
                      }
                      onChange={(e) =>
                        updateMilestone(index, "amount", parseFloat(e.target.value) || 0)
                      }
                      disabled={loading || (milestones.length >= 2 && index === milestones.length - 1)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You pay: ${((m.amount || 0) * (1 + TRANSACTION_FEE_PERCENT / 100)).toFixed(2)} (incl. 3% transaction fee) · Digger receives: ${isExclusive ? (index === 0 ? ((m.amount || 0) + bidAmount * 0.07).toFixed(2) : (m.amount || 0).toFixed(2)) : ((m.amount || 0) * (1 - PLATFORM_FEE_PERCENT / 100)).toFixed(2)}${isExclusive ? (index === 0 ? " (milestone + 7% deposit)" : " (full amount; 8% from deposit)") : " (after 8% platform fee)"}
                  </p>
                </div>
                {milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMilestone(index)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-border min-h-[44px] sm:min-h-0">
              Cancel
            </Button>
            <Button
              onClick={handleCreateContract}
              disabled={
                loading ||
                diggerEligibility === "digger_payouts_not_set_up" ||
                diggerEligibility === "digger_payouts_pending_verification"
              }
              title={
                diggerEligibility === "digger_payouts_not_set_up" || diggerEligibility === "digger_payouts_pending_verification"
                  ? "The Digger must complete payout setup first"
                  : undefined
              }
              className="min-h-[44px] sm:min-h-0"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create contract
            </Button>
          </div>
          {(diggerEligibility === "digger_payouts_not_set_up" ||
            diggerEligibility === "digger_payouts_pending_verification") && (
            <p className="text-xs text-muted-foreground text-right">
              Once the Digger completes payout setup (Stripe Connect), you can create the contract here.
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Secure payments via Stripe. You’re only charged when you approve a milestone.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
