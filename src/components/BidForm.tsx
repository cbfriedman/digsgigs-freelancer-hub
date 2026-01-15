import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Percent, CreditCard, AlertCircle } from "lucide-react";
import { z } from "zod";

// SECURITY: Input validation schema
const bidSchema = z.object({
  amount: z.number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000")
    .refine((val) => Number.isFinite(val), "Amount must be a valid number"),
  timeline: z.string()
    .trim()
    .min(3, "Timeline must be at least 3 characters")
    .max(100, "Timeline must be less than 100 characters"),
  proposal: z.string()
    .trim()
    .min(50, "Proposal must be at least 50 characters")
    .max(5000, "Proposal must be less than 5000 characters"),
});

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.02; // 2%
const REFERRAL_FEE_MIN = 100; // $100 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap

interface BidFormProps {
  gigId: string;
  diggerId: string;
  onSuccess: () => void;
  initialPricingModel?: "pay_per_lead" | "success_based";
}

export const BidForm = ({ gigId, diggerId, onSuccess, initialPricingModel = "pay_per_lead" }: BidFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [proposal, setProposal] = useState("");
  const [includesEscrowCost, setIncludesEscrowCost] = useState(false);
  const [pricingModel] = useState<"pay_per_lead" | "success_based">(initialPricingModel);

  const calculateReferralFee = (bidAmount: number): number => {
    const fee = bidAmount * REFERRAL_FEE_RATE;
    // Apply $100 min and $249 cap
    return Math.max(REFERRAL_FEE_MIN, Math.min(fee, REFERRAL_FEE_CAP));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !timeline || !proposal) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // SECURITY: Validate inputs before submission
      const validated = bidSchema.parse({
        amount: parseFloat(amount),
        timeline: timeline,
        proposal: proposal,
      });

      const bidData: any = {
        gig_id: gigId,
        digger_id: diggerId,
        amount: validated.amount,
        timeline: validated.timeline,
        proposal: validated.proposal,
        pricing_model: pricingModel,
      };

      // Add referral fee info for success-based bids
      if (pricingModel === "success_based") {
        bidData.referral_fee_rate = REFERRAL_FEE_RATE;
        bidData.referral_fee_cap_cents = REFERRAL_FEE_CAP * 100;
      }

      const { data: insertedBid, error } = await supabase
        .from('bids' as any)
        .insert(bidData)
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'submitted',
            bidId: (insertedBid as any)?.id,
            gigId,
            diggerId,
            amount: validated.amount,
            timeline: validated.timeline,
            pricingModel,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the bid submission if email fails
      }

      toast({
        title: "Bid submitted!",
        description: pricingModel === "success_based"
          ? "Your bid has been submitted. A 2% referral fee will be charged only if you're selected."
          : "Your bid has been submitted successfully.",
      });

      // Track custom event for bid submission
      const win = window as any;
      if (win.fbq) {
        try {
          win.fbq('trackCustom', 'SubmitBid', {
            bid_id: (insertedBid as any)?.id,
            gig_id: gigId,
            digger_id: diggerId,
            amount: validated.amount,
            currency: 'USD',
            pricing_model: pricingModel,
          });
        } catch (error) {
          console.warn('Facebook Pixel: Error tracking SubmitBid event', error);
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      
      if (error instanceof z.ZodError) {
        // Show validation errors
        toast({
          title: "Invalid input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit bid",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const estimatedFee = calculateReferralFee(parsedAmount);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Submit Your Bid</CardTitle>
            <CardDescription>
              Enter your proposal details to bid on this gig
            </CardDescription>
          </div>
          {pricingModel === "success_based" ? (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Percent className="w-3 h-3 mr-1" />
              Exclusive (Pay on Acceptance)
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CreditCard className="w-3 h-3 mr-1" />
              Non-Exclusive
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pricingModel === "success_based" && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                  Exclusive Engagement Selected
                </p>
                <p className="text-orange-700 dark:text-orange-300">
                  You pay nothing upfront. A one-time 2% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) 
                  will be charged only if you're awarded and accept the job.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Your Bid Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {pricingModel === "success_based" && parsedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Referral fee if selected: ${estimatedFee.toFixed(2)}
                {estimatedFee >= REFERRAL_FEE_CAP && " (capped)"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline">Timeline</Label>
            <Input
              id="timeline"
              placeholder="e.g., 2 weeks, 1 month"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal">Proposal (minimum 50 characters)</Label>
            <Textarea
              id="proposal"
              placeholder="Describe your approach, experience, and why you're the best fit for this project..."
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={6}
              required
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {proposal.length}/5000 characters
            </p>
          </div>

          {pricingModel === "pay_per_lead" && (
            <div className="space-y-3 pt-2 pb-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="includesEscrowCost"
                  checked={includesEscrowCost}
                  onCheckedChange={(checked) => setIncludesEscrowCost(checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="includesEscrowCost" className="cursor-pointer leading-relaxed">
                    My bid includes escrow costs (if applicable)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Info className="inline-block h-3 w-3 mr-1" />
                    If the gigger requests escrow protection, an 8% fee will apply. Check this if you've added that cost to your bid amount.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Bid'
            )}
          </Button>

          {pricingModel === "success_based" && (
            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to pay a 2% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) if you're awarded and accept this job.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
