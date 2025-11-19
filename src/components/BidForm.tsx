import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
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

interface BidFormProps {
  gigId: string;
  diggerId: string;
  onSuccess: () => void;
}

export const BidForm = ({ gigId, diggerId, onSuccess }: BidFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [proposal, setProposal] = useState("");
  const [includesEscrowCost, setIncludesEscrowCost] = useState(false);

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

      const { data: bidData, error } = await supabase
        .from('bids' as any)
        .insert({
          gig_id: gigId,
          digger_id: diggerId,
          amount: validated.amount,
          timeline: validated.timeline,
          proposal: validated.proposal,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'submitted',
            bidId: (bidData as any)?.id,
            gigId,
            diggerId,
            amount: validated.amount,
            timeline: validated.timeline,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the bid submission if email fails
      }

      toast({
        title: "Bid submitted!",
        description: "Your bid has been submitted successfully.",
      });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Your Bid</CardTitle>
        <CardDescription>
          Enter your proposal details to bid on this gig
        </CardDescription>
      </CardHeader>
      <CardContent>
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
        </form>
      </CardContent>
    </Card>
  );
};
