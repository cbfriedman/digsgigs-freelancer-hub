import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "");

interface Milestone {
  description: string;
  amount: number;
}

interface EscrowContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidId: string;
  bidAmount: number;
  gigTitle: string;
  onComplete?: () => void;
}

export const EscrowContractDialog = ({
  open,
  onOpenChange,
  bidId,
  bidAmount,
  gigTitle,
  onComplete,
}: EscrowContractDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: "", amount: bidAmount }
  ]);

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
  const platformFee = bidAmount * 0.05;

  const handleCreateEscrow = async () => {
    // Validate milestones
    if (milestones.some(m => !m.description || m.amount <= 0)) {
      toast({
        title: "Invalid milestones",
        description: "All milestones must have a description and amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (Math.abs(totalMilestoneAmount - bidAmount) > 0.01) {
      toast({
        title: "Amount mismatch",
        description: `Milestone total ($${totalMilestoneAmount.toFixed(2)}) must equal contract amount ($${bidAmount.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-escrow-contract", {
        body: { bidId, milestones },
      });

      if (error) throw error;

      const { clientSecret, escrowContractId } = data;

      // Initialize Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      // Redirect to Stripe payment
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret);

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Confirm payment on backend
      await supabase.functions.invoke("confirm-escrow-payment", {
        body: {
          escrowContractId,
          paymentIntentId: clientSecret.split("_secret_")[0],
        },
      });

      toast({
        title: "Escrow created!",
        description: `Funds secured for "${gigTitle}". Milestones can now be released.`,
      });

      onOpenChange(false);
      onComplete?.();
    } catch (error: any) {
      console.error("Error creating escrow:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create escrow contract",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Up Escrow Contract</DialogTitle>
          <DialogDescription>
            Create milestones for the work. You'll pay the full amount upfront, and funds will be
            released to the professional as milestones are completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Project</Label>
            <Input value={gigTitle} disabled />
          </div>

          <div className="grid gap-2">
            <Label>Contract Amount</Label>
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
                Add Milestone
              </Button>
            </div>

            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-2 items-start border p-3 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="e.g., Initial design mockups"
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, "description", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={milestone.amount || ""}
                      onChange={(e) => updateMilestone(index, "amount", parseFloat(e.target.value) || 0)}
                      disabled={loading}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Platform fee (5%): ${(milestone.amount * 0.05).toFixed(2)} | 
                    Digger receives: ${(milestone.amount * 0.95).toFixed(2)}
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

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Milestones:</span>
              <span className={totalMilestoneAmount !== bidAmount ? "text-destructive" : ""}>
                ${totalMilestoneAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Platform Fee (5%):</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>You Pay Now:</span>
              <span>${bidAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreateEscrow} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay & Create Escrow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};