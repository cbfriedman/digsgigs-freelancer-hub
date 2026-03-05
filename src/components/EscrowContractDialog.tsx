import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useStripeConfig } from "@/hooks/useStripeConfig";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Milestone {
  description: string;
  amount: number;
  hoursWorked?: number;
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
  const { stripePromise } = useStripeConfig();
  const [loading, setLoading] = useState(false);
  const [contractType, setContractType] = useState<"fixed" | "hourly">("fixed");
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: "", amount: bidAmount, hoursWorked: 0 }
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { description: "", amount: 0, hoursWorked: 0 }]);
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
  // Note: This is a placeholder calculation - actual fee is tier-based (9%/8%/4%) and calculated on backend
  const calculateMilestoneFee = (amount: number) => Math.max(10, amount * 0.09);
  const totalPlatformFee = milestones.reduce((sum, m) => sum + calculateMilestoneFee(m.amount || 0), 0);

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
        body: { 
          bidId, 
          milestones,
          contractType,
          hourlyRate: contractType === "hourly" ? hourlyRate : undefined,
          estimatedHours: contractType === "hourly" ? estimatedHours : undefined,
        },
      });

      if (error) throw error;

      const { clientSecret, escrowContractId } = data;

      // Initialize Stripe
      if (!stripePromise) {
        throw new Error("Stripe is not configured. Set Stripe keys in Supabase Edge Function secrets and Stripe mode in Admin.");
      }
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      // Redirect to Stripe payment
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret);

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Confirm payment on backend
      const paymentIntentId = clientSecret?.split("_secret_")[0] || clientSecret;
      await invokeEdgeFunction(supabase, "confirm-escrow-payment", {
        body: {
          escrowContractId,
          paymentIntentId,
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
        description: error?.message || "Failed to create escrow contract",
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
            released to the freelancer as milestones are completed. 5% fee with $10 minimum per payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Contract Type</Label>
            <RadioGroup value={contractType} onValueChange={(v) => setContractType(v as "fixed" | "hourly")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal">Fixed Price</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="hourly" />
                <Label htmlFor="hourly" className="font-normal">Hourly Rate</Label>
              </div>
            </RadioGroup>
          </div>

          {contractType === "hourly" && (
            <>
              <div className="grid gap-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={hourlyRate || ""}
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={estimatedHours || ""}
                  onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </>
          )}

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
                  {contractType === "hourly" && (
                    <div>
                      <Label className="text-xs">Hours Worked</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0"
                        value={milestone.hoursWorked || ""}
                        onChange={(e) => updateMilestone(index, "hoursWorked", parseFloat(e.target.value) || 0)}
                        disabled={loading}
                      />
                    </div>
                  )}
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
                    Platform fee (5%, min $10): ${calculateMilestoneFee(milestone.amount).toFixed(2)} | 
                    Digger receives: ${(milestone.amount - calculateMilestoneFee(milestone.amount)).toFixed(2)}
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
              <span>Total Platform Fee (5%, $10 min per payment):</span>
              <span>${totalPlatformFee.toFixed(2)}</span>
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