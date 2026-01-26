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
import { Loader2, CheckCircle, Lock, AlertTriangle } from "lucide-react";

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.08; // 8% for exclusive
const REFERRAL_FEE_MIN = 10; // $10 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap
// Non-exclusive pricing for deposit calculation
const NON_EXCLUSIVE_RATE = 0.02; // 2%
const NON_EXCLUSIVE_MIN = 3; // $3 minimum
const NON_EXCLUSIVE_MAX = 49; // $49 maximum
// Deposit: higher of (5% + non-exclusive cost) or $249
const DEPOSIT_BASE_RATE = 0.05; // 5% base
const DEPOSIT_MIN = 249; // $249 minimum deposit

// Calculate non-exclusive lead cost for deposit formula
const calculateNonExclusiveCost = (bidAmount: number): number => {
  const percentageCost = bidAmount * NON_EXCLUSIVE_RATE;
  return Math.min(NON_EXCLUSIVE_MAX, Math.max(NON_EXCLUSIVE_MIN, percentageCost));
};

// Calculate Gigger deposit: higher of (5% + non-exclusive cost) or $249
const calculateGiggerDeposit = (bidAmount: number): number => {
  const nonExclusiveCost = calculateNonExclusiveCost(bidAmount);
  const percentageDeposit = (bidAmount * DEPOSIT_BASE_RATE) + nonExclusiveCost;
  return Math.max(DEPOSIT_MIN, percentageDeposit);
};

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
  const isExclusive = pricingModel === "success_based";
  const calculatedFee = bidAmount * REFERRAL_FEE_RATE;
  const referralFee = isExclusive 
    ? Math.max(REFERRAL_FEE_MIN, Math.min(calculatedFee, REFERRAL_FEE_CAP)) 
    : 0;
  const giggerDeposit = isExclusive ? calculateGiggerDeposit(bidAmount) : 0;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmHire = async () => {
    setConfirming(true);
    try {
      // For exclusive bids, redirect to deposit payment first
      if (isExclusive) {
        const { data, error } = await supabase.functions.invoke("charge-gigger-deposit", {
          body: {
            gigId,
            bidId,
            giggerId: (await supabase.auth.getUser()).data.user?.id,
            diggerId,
            origin: window.location.origin,
          },
        });

        if (error) throw error;

        if (data?.requiresPayment && data?.checkoutUrl) {
          // Redirect to Stripe checkout
          window.open(data.checkoutUrl, "_blank");
          toast({
            title: "Complete Payment",
            description: "Please complete the deposit payment in the new tab to finalize the award.",
          });
          setOpen(false);
          return;
        }
      } else {
        // Non-exclusive: proceed with normal award
        const { error } = await supabase.functions.invoke("award-lead", {
          body: {
            gigId,
            diggerId,
            bidId,
            awardMethod: "consumer_hire",
          },
        });

        if (error) throw error;
      }

      toast({
        title: isExclusive ? "Exclusive Award Confirmed!" : "Hire Confirmed!",
        description: isExclusive 
          ? `${diggerName} has been exclusively awarded this job. They'll be notified to accept within 24 hours.`
          : `${diggerName} has been awarded the lead. They can now start work.`,
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
          {isExclusive ? "Award Job (Exclusive)" : "Confirm Hire"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExclusive && <Lock className="h-5 w-5 text-orange-500" />}
            {isExclusive ? "Confirm Exclusive Award" : "Confirm Hire"}
          </DialogTitle>
          <DialogDescription>
            {isExclusive ? (
              <span className="block mt-2">
                You are awarding this job to <strong>{diggerName}</strong>.
                <br />
                <span className="text-orange-600 font-medium mt-2 block">
                  This job will become exclusive and cannot be awarded to any other professional.
                </span>
              </span>
            ) : (
              `Are you ready to officially award this job to ${diggerName}?`
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

          {isExclusive ? (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    Exclusive Award Terms
                  </p>
                  <ul className="text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• This job will become exclusive to {diggerName}</li>
                    <li>• No other professionals can be awarded this job</li>
                    <li>• <strong>You will pay a 5% down-payment of ${giggerDeposit.toFixed(0)} now</strong> (higher of 5% + lead cost or $249)</li>
                    <li>• This down-payment is deducted from the total you owe {diggerName} at job completion</li>
                    <li>• If {diggerName} accepts within 24 hours, the 5% is released to them as an advance</li>
                    <li>• If they don't accept in 24 hours, your deposit is refunded</li>
                    <li>• The 8% referral fee (${referralFee.toFixed(0)}) is paid out of your down-payment</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>✅ The digger will be notified immediately</p>
              <p>✅ This lead will be marked as awarded</p>
              <p>✅ Other diggers will no longer have access</p>
              <p>✅ A 48-hour lock period will begin</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmHire} 
            disabled={confirming}
            className={isExclusive ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              isExclusive ? "Confirm Award" : "Confirm Hire"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}