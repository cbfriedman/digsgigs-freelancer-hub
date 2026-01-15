import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface ConfirmHireDialogProps {
  bidId: string;
  gigId: string;
  diggerId: string;
  diggerName: string;
  bidAmount: number;
  gigTitle: string;
  pricingModel?: string;
  onConfirm?: () => void;
}

export function ConfirmHireDialog({
  bidId,
  gigId,
  diggerId,
  diggerName,
  bidAmount,
  gigTitle,
  pricingModel = "pay_per_lead",
  onConfirm,
}: ConfirmHireDialogProps) {
  const isSuccessBased = pricingModel === "success_based";
  const referralFee = isSuccessBased ? Math.min(bidAmount * 0.02, 249) : 0;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmHire = async () => {
    setConfirming(true);
    try {
      const { error } = await supabase.functions.invoke("award-lead", {
        body: {
          gigId,
          diggerId,
          bidId,
          awardMethod: "consumer_hire",
        },
      });

      if (error) throw error;

      toast({
        title: "Hire Confirmed!",
        description: `${diggerName} has been awarded the lead. They can now start work.`,
      });

      setOpen(false);
      onConfirm?.();
    } catch (error: any) {
      console.error("Error confirming hire:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm hire",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Confirm Hire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Hire</DialogTitle>
          <DialogDescription>
            Are you ready to officially award this job to {diggerName}?
            {isSuccessBased && (
              <span className="block mt-2 text-orange-600 font-medium">
                A one-time 2% referral fee (${referralFee.toFixed(2)}) will be charged to {diggerName}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Project:</span>
              <span className="text-sm">{gigTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Digger:</span>
              <span className="text-sm">{diggerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Bid Amount:</span>
              <span className="text-sm font-bold">${bidAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>✅ The digger will be notified immediately</p>
            <p>✅ This lead will be marked as awarded</p>
            <p>✅ Other diggers will no longer have access</p>
            <p>✅ A 48-hour lock period will begin</p>
            {bidAmount > 0 && (
              <p className="text-xs pt-2 border-t">
                Note: If this was a telemarketing-sourced lead, the telemarketer will receive their commission.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirmHire} disabled={confirming}>
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Hire"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
