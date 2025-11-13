import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
      const { error } = await supabase
        .from('bids')
        .insert({
          gig_id: gigId,
          digger_id: diggerId,
          amount: parseFloat(amount),
          timeline,
          proposal,
        });

      if (error) throw error;

      toast({
        title: "Bid submitted!",
        description: "Your bid has been submitted successfully.",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit bid",
        variant: "destructive",
      });
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
            <Label htmlFor="proposal">Proposal</Label>
            <Textarea
              id="proposal"
              placeholder="Describe your approach, experience, and why you're the best fit for this project..."
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              rows={6}
              required
            />
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
