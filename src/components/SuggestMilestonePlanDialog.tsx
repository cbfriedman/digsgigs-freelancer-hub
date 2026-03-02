import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Milestone {
  description: string;
  amount: number;
}

const DEPOSIT_RATE = 0.15;

interface SuggestMilestonePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  bidId: string;
  bidAmount: number;
  gigTitle: string;
  pricingModel?: string | null;
  /** Existing suggestion to pre-fill when digger is editing (kept in form, not overwritten). */
  suggestedMilestones?: { description: string; amount: number }[] | null;
  onComplete?: () => void;
}

export function SuggestMilestonePlanDialog({
  open,
  onOpenChange,
  gigId,
  bidId,
  bidAmount,
  gigTitle,
  pricingModel,
  suggestedMilestones,
  onComplete,
}: SuggestMilestonePlanDialogProps) {
  const { toast } = useToast();
  const isExclusive = pricingModel === "success_based";
  const contractAmount = isExclusive
    ? Math.round(bidAmount * (1 - DEPOSIT_RATE) * 100) / 100
    : bidAmount;

  const [loading, setLoading] = useState(false);
  const [milestoneTotal, setMilestoneTotal] = useState<number>(contractAmount);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: "", amount: contractAmount },
  ]);

  useEffect(() => {
    if (!open) return;
    const hasSuggested = suggestedMilestones && Array.isArray(suggestedMilestones) && suggestedMilestones.length > 0;
    if (hasSuggested) {
      const total = suggestedMilestones!.reduce((s, m) => s + (m.amount ?? 0), 0);
      setMilestoneTotal(total);
      setMilestones(suggestedMilestones!.map((m) => ({ description: m.description ?? "", amount: m.amount ?? 0 })));
    } else {
      setMilestoneTotal(contractAmount);
      setMilestones([{ description: "", amount: contractAmount }]);
    }
  }, [open, bidId, contractAmount, suggestedMilestones]);

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

  const handleSuggest = async () => {
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
        description: `Milestone total ($${totalMilestoneAmount.toFixed(2)}) must equal contract amount ($${milestoneTotal.toFixed(2)}).`,
        variant: "destructive",
      });
      return;
    }

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
      await invokeEdgeFunction(supabase, "suggest-milestone-plan", {
        body: { gigId, bidId, milestones: milestonesToSend },
      });
      toast({
        title: "Plan suggested",
        description: "The client can review and create the contract when they're ready.",
      });
      onOpenChange(false);
      onComplete?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to suggest plan";
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
          <DialogTitle>Suggest milestone plan</DialogTitle>
          <DialogDescription>
            {suggestedMilestones && suggestedMilestones.length > 0
              ? "Your existing suggestion is shown below. You can edit any description or amount and submit again."
              : "Propose a milestone breakdown for the client. Only the client can create the payment contract; they can accept your plan or adjust it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Project</Label>
            <Input value={gigTitle} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Contract amount (milestone budget)</Label>
            <Input value={`$${milestoneTotal.toFixed(2)}`} disabled />
            {milestoneTotal !== bidAmount && (
              <p className="text-xs text-muted-foreground">
                Bid ${bidAmount.toFixed(2)} − 15% deposit = ${milestoneTotal.toFixed(2)}. Total of all milestone amounts must equal this.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              7% deposit is added upon first milestone payment.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Milestones</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                Add milestone
              </Button>
            </div>

            {milestones.map((m, index) => (
              <div key={index} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/30">
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
                              milestoneTotal - milestones.slice(0, -1).reduce((s, x) => s + (x.amount || 0), 0)
                            ).toFixed(2)
                          : m.amount || ""
                      }
                      onChange={(e) => updateMilestone(index, "amount", parseFloat(e.target.value) || 0)}
                      disabled={loading || (milestones.length >= 2 && index === milestones.length - 1)}
                    />
                  </div>
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

          <div className="border-t pt-4 flex justify-between text-sm">
            <span>Total milestones</span>
            <span className={Math.abs(totalMilestoneAmount - milestoneTotal) > 0.01 ? "text-destructive" : ""}>
              ${totalMilestoneAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSuggest} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suggest plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
