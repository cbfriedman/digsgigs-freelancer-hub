import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
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
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";

// Referral fee configuration
const REFERRAL_FEE_RATE = 0.08; // 8%
const REFERRAL_FEE_MIN = 99; // $99 minimum (no cap)
const DEPOSIT_RATE = 0.05; // 5% deposit from Gigger when Digger accepts

interface AcceptAwardDialogProps {
  bidId: string;
  gigId: string;
  diggerId: string;
  bidAmount: number;
  gigTitle: string;
  pricingModel: string;
  onAccept?: () => void;
}

export function AcceptAwardDialog({
  bidId,
  gigId,
  diggerId,
  bidAmount,
  gigTitle,
  pricingModel,
  onAccept,
}: AcceptAwardDialogProps) {
  const isExclusive = pricingModel === "success_based";
  const calculatedFee = bidAmount * REFERRAL_FEE_RATE;
  const referralFee = Math.max(REFERRAL_FEE_MIN, calculatedFee); // 8% with $99 minimum, no cap
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const handleAcceptAward = async () => {
    setAccepting(true);
    try {
      const data = await invokeEdgeFunction<{ requiresPayment?: boolean; checkoutUrl?: string }>(
        supabase,
        "digger-accept-award",
        {
          body: {
            bidId,
            gigId,
            diggerId,
          },
        }
      );

      // If payment requires checkout (no saved payment method)
      if (data?.requiresPayment && data?.checkoutUrl) {
        toast({
          title: "Payment Required",
          description: "Redirecting to payment page...",
        });
        window.open(data.checkoutUrl, '_blank');
        setOpen(false);
        return;
      }

      toast({
        title: "Job Accepted!",
        description: "You've accepted this job. Time to start work! Most freelancers collect a deposit from the client before starting.",
      });

      setOpen(false);
      onAccept?.();
    } catch (error: any) {
      console.error("Error accepting award:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to accept award",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  // For non-exclusive bids, no acceptance dialog is needed
  if (!isExclusive) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600">
          <CheckCircle className="h-4 w-4" />
          Accept & Ready to Start
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-orange-500" />
            Accept Exclusive Job
          </DialogTitle>
          <DialogDescription>
            You're accepting an exclusive awarded job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Project:</span>
              <span className="text-sm">{gigTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Your Bid:</span>
              <span className="text-sm font-bold">${bidAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  One-Time Referral Fee
                </p>
                <p className="text-orange-700 dark:text-orange-300">
                  A one-time 2% referral fee applies:
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ${referralFee.toFixed(0)}
                </p>
                <p className="text-xs text-orange-600">
                  (${REFERRAL_FEE_MIN} minimum, no cap)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Pro Tip
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Most freelancers collect a deposit from the client before starting work.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={accepting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAcceptAward} 
            disabled={accepting}
            className="bg-green-600 hover:bg-green-700"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Accept & Ready to Start"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}