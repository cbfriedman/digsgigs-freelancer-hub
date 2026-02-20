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

interface PaymentContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  bidId: string;
  bidAmount: number;
  gigTitle: string;
  onComplete?: () => void;
}

export function PaymentContractDialog({
  open,
  onOpenChange,
  gigId,
  bidId,
  bidAmount,
  gigTitle,
  onComplete,
}: PaymentContractDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [diggerEligibility, setDiggerEligibility] = useState<
    null | "ok" | "digger_payouts_not_set_up" | "digger_payouts_pending_verification"
  >(null);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: "", amount: bidAmount },
  ]);

  const fetchEligibility = useCallback(async () => {
    setCheckingEligibility(true);
    try {
      const [paymentData, eligibilityData] = await Promise.all([
        invokeEdgeFunction<{ paymentMethods?: unknown[] }>(
          supabase,
          "manage-payment-methods",
          { method: "GET" }
        ).catch(() => ({ paymentMethods: [] })),
        invokeEdgeFunction<{ eligible?: boolean; reason?: string }>(supabase, "check-payment-contract-eligibility", {
          body: { gigId, bidId },
        }).catch(() => ({ eligible: false, reason: "unknown" })),
      ]);
      setHasPaymentMethod((paymentData?.paymentMethods?.length ?? 0) > 0);
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
  }, [gigId, bidId]);

  useEffect(() => {
    if (!open) return;
    fetchEligibility();
  }, [open, fetchEligibility]);

  const addMilestone = () => {
    setMilestones([...milestones, { description: "", amount: 0 }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalTransactionFee = milestones.reduce(
    (sum, m) => sum + (m.amount || 0) * (TRANSACTION_FEE_PERCENT / 100),
    0
  );
  const totalPlatformFee = milestones.reduce(
    (sum, m) => sum + (m.amount || 0) * (PLATFORM_FEE_PERCENT / 100),
    0
  );
  const totalGiggerPays = totalMilestoneAmount + totalTransactionFee;
  const totalDiggerReceives = totalMilestoneAmount - totalPlatformFee;

  const handleCreateContract = async () => {
    if (milestones.some((m) => !m.description?.trim() || (m.amount ?? 0) <= 0)) {
      toast({
        title: "Invalid milestones",
        description: "Each milestone needs a description and amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    if (Math.abs(totalMilestoneAmount - bidAmount) > 0.01) {
      toast({
        title: "Amount mismatch",
        description: `Milestone total ($${totalMilestoneAmount.toFixed(2)}) must equal contract amount ($${bidAmount.toFixed(2)}).`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await invokeEdgeFunction(supabase, "create-payment-contract", {
        body: { gigId, bidId, milestones },
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set up payment contract</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              All payments go through our platform—secure and reliable. You pay a <strong>3% transaction fee</strong> per milestone when you approve (Gigger total = milestone + 3%). The Digger receives the milestone amount minus an <strong>8% platform fee</strong> (paid by Digger). No upfront charge; you pay only when you’re satisfied with the work.
            </span>
            <span className="block text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <strong>How it works:</strong> 1) Set milestones below → 2) The Digger delivers and submits each one → 3) You review and click “Approve & pay” (your card is charged then; the Digger is paid right away).
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {diggerEligibility === "digger_payouts_not_set_up" && (
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
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
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
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
            <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
              <CreditCard className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Add a payment method first. You’ll use it only when you approve each milestone—secure and reliable (Stripe).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="shrink-0">
                        Add payment method here
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

          <div className="grid gap-2">
            <Label>Project</Label>
            <Input value={gigTitle} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Contract amount</Label>
            <Input value={`$${bidAmount.toFixed(2)}`} disabled />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Milestones</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add milestone
              </Button>
            </div>

            {milestones.map((m, index) => (
              <div
                key={index}
                className="flex gap-2 items-start border rounded-lg p-3 bg-muted/30"
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
                    <Label className="text-xs">Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={m.amount || ""}
                      onChange={(e) =>
                        updateMilestone(index, "amount", parseFloat(e.target.value) || 0)
                      }
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You pay: ${((m.amount || 0) * (1 + TRANSACTION_FEE_PERCENT / 100)).toFixed(2)} (incl. 3% transaction fee) · Digger receives: ${((m.amount || 0) * (1 - PLATFORM_FEE_PERCENT / 100)).toFixed(2)} (after 8% platform fee)
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

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total milestones</span>
              <span className={Math.abs(totalMilestoneAmount - bidAmount) > 0.01 ? "text-destructive" : ""}>
                ${totalMilestoneAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Est. 3% transaction fee (you pay per milestone)</span>
              <span>${totalTransactionFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Your total (milestones + 3%)</span>
              <span>${totalGiggerPays.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Digger net (after 8% platform fee)</span>
              <span>${totalDiggerReceives.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateContract}
              disabled={
                loading ||
                hasPaymentMethod === false ||
                diggerEligibility === "digger_payouts_not_set_up" ||
                diggerEligibility === "digger_payouts_pending_verification"
              }
              title={
                hasPaymentMethod === false
                  ? "Add a payment method first"
                  : diggerEligibility === "digger_payouts_not_set_up" || diggerEligibility === "digger_payouts_pending_verification"
                    ? "The Digger must complete payout setup first"
                    : undefined
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create contract
            </Button>
          </div>
          {hasPaymentMethod === false && (
            <p className="text-sm text-muted-foreground text-right">
              Add a payment method above to enable Create contract.
            </p>
          )}
          {(diggerEligibility === "digger_payouts_not_set_up" ||
            diggerEligibility === "digger_payouts_pending_verification") && (
            <p className="text-sm text-muted-foreground text-right">
              Once the Digger completes payout setup (Stripe Connect), you can create the contract here.
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Shield className="h-4 w-4 shrink-0" />
            <span>Payments are secure and powered by Stripe. You’re only charged when you approve a milestone.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
