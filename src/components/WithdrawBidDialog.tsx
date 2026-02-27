import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

interface WithdrawBidDialogProps {
  bidId: string;
  bidAmount: number;
  gigTitle: string;
  onSuccess?: () => void;
}

export const WithdrawBidDialog = ({
  bidId,
  bidAmount,
  gigTitle,
  onSuccess,
}: WithdrawBidDialogProps) => {
  const [loading, setLoading] = useState(false);
  const penaltyAmount = bidAmount * 0.25;

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const data = await invokeEdgeFunction<{ url?: string }>(supabase, "withdraw-bid", {
        body: { bidId, origin: window.location.origin },
      });

      if (data?.url) {
        toast.info("Complete the penalty payment to withdraw your bid");
        window.location.href = data.url;
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error withdrawing bid:", error);
      toast.error(error?.message || "Failed to initiate bid withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
          Withdraw Bid
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Withdraw Bid with 25% Penalty
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              You are about to withdraw your accepted bid for:{" "}
              <strong>{gigTitle}</strong>
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Original Bid Amount:</span>
                <span className="font-semibold">${bidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>Withdrawal Penalty (25%):</span>
                <span className="font-semibold">${penaltyAmount.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm">
              By withdrawing from this accepted bid, you will be charged a 25%
              penalty of your bid amount. The gig will be reopened for other
              diggers to bid on.
            </p>
            <p className="text-sm font-semibold text-destructive">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className="border-border bg-transparent hover:bg-muted/50">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleWithdraw}
            disabled={loading}
            className="bg-destructive/90 hover:bg-destructive text-destructive-foreground border-0 shadow-none"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pay Penalty & Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};