import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CompleteWorkDialogProps {
  bidId: string;
  bidAmount: number;
  diggerId: string;
  gigTitle: string;
  onComplete?: () => void;
}

export const CompleteWorkDialog = ({
  bidId,
  bidAmount,
  diggerId,
  gigTitle,
  onComplete,
}: CompleteWorkDialogProps) => {
  const { toast } = useToast();
  const { calculateCommission } = useCommissionCalculator();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(bidAmount.toString());
  const [tier, setTier] = useState<'free' | 'pro' | 'premium'>('free');

  const amount = parseFloat(finalAmount) || 0;
  const commission = calculateCommission(amount, tier);

  const loadDiggerTier = async () => {
    try {
      const { data } = await supabase
        .from('digger_profiles' as any)
        .select('subscription_tier')
        .eq('id', diggerId)
        .single();
      
      setTier(((data as any)?.subscription_tier as 'free' | 'pro' | 'premium') || 'free');
    } catch (error) {
      console.error('Error loading digger tier:', error);
    }
  };

  const handleComplete = async () => {
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-transaction', {
        body: {
          bidId,
          totalAmount: parseFloat(finalAmount),
        },
      });

      if (error) throw error;

      toast({
        title: "Work completed!",
        description: `Transaction created successfully. Digger will receive $${data.transaction.digger_payout.toFixed(2)}`,
      });

      setOpen(false);
      onComplete?.();
    } catch (error: any) {
      console.error('Error completing work:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete work",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadDiggerTier();
    }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Work</DialogTitle>
          <DialogDescription>
            Mark this work as completed and create a transaction record with automatic commission calculation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gig-title">Gig</Label>
            <Input id="gig-title" value={gigTitle} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="final-amount">Final Payment Amount ($)</Label>
            <Input
              id="final-amount"
              type="number"
              step="0.01"
              min="0"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="Enter final amount"
            />
            <p className="text-sm text-muted-foreground">
              Original bid: ${bidAmount.toFixed(2)}
            </p>
          </div>

          {amount > 0 && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-sm">Commission Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Digger Tier:</span>
                  <span className="font-medium capitalize">
                    {tier === 'free' ? 'Free (9%)' : 
                     tier === 'pro' ? 'Pro (4%)' : 
                     'Premium (0%)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Commission ({(commission.rate * 100).toFixed(0)}%):</span>
                  <span className="font-medium">-${commission.commissionAmount.toFixed(2)}</span>
                </div>
                {commission.minimumFee > 0 && commission.commissionAmount === commission.minimumFee && (
                  <p className="text-xs text-muted-foreground">* Minimum fee of ${commission.minimumFee} applied</p>
                )}
                <div className="flex justify-between text-primary font-semibold pt-2 border-t">
                  <span>Digger Receives:</span>
                  <span>${commission.diggerPayout.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={loading || !finalAmount || parseFloat(finalAmount) <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete & Create Transaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
