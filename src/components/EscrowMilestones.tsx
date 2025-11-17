import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Milestone {
  id: string;
  milestone_number: number;
  description: string;
  amount: number;
  platform_fee: number;
  digger_payout: number;
  status: string;
  released_at: string | null;
}

interface EscrowContract {
  id: string;
  total_amount: number;
  platform_fee_amount: number;
  status: string;
  created_at: string;
  funded_at: string | null;
  gigs: {
    title: string;
  };
}

interface EscrowMilestonesProps {
  gigId: string;
  isConsumer: boolean;
}

export const EscrowMilestones = ({ gigId, isConsumer }: EscrowMilestonesProps) => {
  const { toast } = useToast();
  const [contract, setContract] = useState<EscrowContract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  useEffect(() => {
    loadEscrowData();
  }, [gigId]);

  const loadEscrowData = async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from("escrow_contracts")
        .select("*, gigs(title)")
        .eq("gig_id", gigId)
        .single();

      if (contractError) throw contractError;

      setContract(contractData as any);

      const { data: milestonesData, error: milestonesError } = await supabase
        .from("milestone_payments")
        .select("*")
        .eq("escrow_contract_id", contractData.id)
        .order("milestone_number");

      if (milestonesError) throw milestonesError;

      setMilestones(milestonesData || []);
    } catch (error) {
      console.error("Error loading escrow data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    setReleasing(milestoneId);

    try {
      const { error } = await supabase.functions.invoke("release-milestone", {
        body: { milestoneId },
      });

      if (error) throw error;

      toast({
        title: "Milestone released!",
        description: "Payment has been transferred to the professional.",
      });

      loadEscrowData();
    } catch (error: any) {
      console.error("Error releasing milestone:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to release milestone",
        variant: "destructive",
      });
    } finally {
      setReleasing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading escrow details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escrow Contract</CardTitle>
        <CardDescription>
          Milestone-based payments for {(contract as any).gigs.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Contract Amount</p>
            <p className="text-2xl font-bold">${contract.total_amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={contract.status === "funded" ? "default" : "secondary"}>
              {contract.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Milestones</h4>
          {milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Milestone {milestone.milestone_number}</span>
                      <Badge
                        variant={
                          milestone.status === "released" ? "default" :
                          milestone.status === "pending" ? "secondary" :
                          "outline"
                        }
                      >
                        {milestone.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {milestone.description}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold">${milestone.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Platform Fee: </span>
                        <span>${milestone.platform_fee.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Digger Payout: </span>
                        <span className="font-semibold text-primary">
                          ${milestone.digger_payout.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {milestone.released_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Released {formatDistanceToNow(new Date(milestone.released_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {isConsumer && contract.status === "funded" && milestone.status === "pending" && (
                    <Button
                      onClick={() => handleReleaseMilestone(milestone.id)}
                      disabled={releasing === milestone.id}
                      size="sm"
                    >
                      {releasing === milestone.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Releasing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Release Payment
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};