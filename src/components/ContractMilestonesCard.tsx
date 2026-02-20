import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, CheckCircle2, Send, CreditCard, Shield } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

interface MilestoneRow {
  id: string;
  milestone_number: number;
  description: string;
  amount: number;
  status: string;
  stripe_payment_intent_id: string | null;
  released_at: string | null;
}

interface ContractWithMilestones {
  id: string;
  consumer_id: string;
  digger_id: string;
  total_amount: number;
  status: string;
  milestone_payments: MilestoneRow[];
}

interface ContractMilestonesCardProps {
  gigId: string;
  currentUserId: string;
  /** When viewing as Digger, pass their digger_profiles.id */
  currentDiggerProfileId: string | null;
  onUpdate?: () => void;
  /** Callback for Gigger to open the "Set up payment contract" dialog (when no contract yet). */
  onSetupContractClick?: () => void;
  /** When 'awarded', Digger view shows Accept/Decline on GigDetail instead of this card. */
  gigStatus?: string | null;
}

export function ContractMilestonesCard({
  gigId,
  currentUserId,
  currentDiggerProfileId,
  onUpdate,
  onSetupContractClick,
  gigStatus,
}: ContractMilestonesCardProps) {
  const { toast } = useToast();
  const [contract, setContract] = useState<ContractWithMilestones | null>(null);
  const [gigInfo, setGigInfo] = useState<{ consumer_id: string; awarded_digger_id: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const isGigger = (contract?.consumer_id ?? gigInfo?.consumer_id) === currentUserId;
  const isAwardedDigger = currentDiggerProfileId && (contract?.digger_id === currentDiggerProfileId || gigInfo?.awarded_digger_id === currentDiggerProfileId);
  const isDigger = !!currentDiggerProfileId && (contract?.digger_id === currentDiggerProfileId || gigInfo?.awarded_digger_id === currentDiggerProfileId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: contractRow, error: contractError } = await supabase
        .from("escrow_contracts")
        .select("id, consumer_id, digger_id, total_amount, status")
        .eq("gig_id", gigId)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      if (contractError || !contractRow) {
        setContract(null);
        if (!contractRow) {
          const { data: gigRow } = await supabase
            .from("gigs")
            .select("consumer_id, awarded_digger_id")
            .eq("id", gigId)
            .single();
          if (!cancelled && gigRow) setGigInfo({ consumer_id: gigRow.consumer_id, awarded_digger_id: gigRow.awarded_digger_id });
          else if (!cancelled) setGigInfo(null);
        } else {
          setGigInfo(null);
        }
        setLoading(false);
        return;
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from("milestone_payments")
        .select("id, milestone_number, description, amount, status, stripe_payment_intent_id, released_at")
        .eq("escrow_contract_id", contractRow.id)
        .order("milestone_number", { ascending: true });

      if (cancelled) return;
      if (milestonesError) {
        setContract(null);
        setGigInfo(null);
        setLoading(false);
        return;
      }
      setContract({
        ...contractRow,
        milestone_payments: milestones ?? [],
      });
      setGigInfo(null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [gigId, onUpdate]);

  const handleSubmitMilestone = async (milestoneId: string) => {
    setSubmittingId(milestoneId);
    try {
      await invokeEdgeFunction(supabase, "submit-milestone", {
        body: { milestonePaymentId: milestoneId },
      });
      toast({ title: "Submitted", description: "Milestone sent for client approval." });
      onUpdate?.();
      setContract((c) => {
        if (!c) return c;
        return {
          ...c,
          milestone_payments: c.milestone_payments.map((m) =>
            m.id === milestoneId ? { ...m, status: "submitted" } : m
          ),
        };
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveAndPay = async (milestoneId: string) => {
    setPayingId(milestoneId);
    try {
      const data = await invokeEdgeFunction<{
        requiresAction?: boolean;
        clientSecret?: string;
        success?: boolean;
      }>(supabase, "charge-milestone", {
        body: { milestonePaymentId: milestoneId },
      });

      if (data?.requiresAction && data?.clientSecret && stripePromise) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe not loaded");
        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) throw error;
        toast({ title: "Payment successful", description: "The professional will receive this milestone amount." });
        onUpdate?.();
        setContract((c) => {
          if (!c) return c;
          return {
            ...c,
            milestone_payments: c.milestone_payments.map((m) =>
              m.id === milestoneId ? { ...m, status: "paid" } : m
            ),
          };
        });
        return;
      }

      if (!data?.success && !data?.requiresAction) {
        throw new Error("Payment did not complete");
      }

      toast({ title: "Payment successful", description: "The professional will receive this milestone amount." });
      onUpdate?.();
      setContract((c) => {
        if (!c) return c;
        return {
          ...c,
          milestone_payments: c.milestone_payments.map((m) =>
            m.id === milestoneId ? { ...m, status: "paid" } : m
          ),
        };
      });
    } catch (e) {
      toast({
        title: "Payment failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center justify-center gap-2 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading payment & milestones…</p>
        </CardContent>
      </Card>
    );
  }

  if (!contract) {
    // When gig is "awarded", the awarded Digger sees Accept/Decline on GigDetail; don't show this card.
    if (gigStatus === "awarded" && isAwardedDigger) {
      return null;
    }
    if ((isGigger || isAwardedDigger) && onSetupContractClick) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & milestones
            </CardTitle>
            <CardDescription>
              Set up the payment contract so you can pay per milestone when you approve the work. You’re only charged when you click “Approve & pay” (3% transaction fee per payment; Digger receives milestone minus 8% platform fee). Secure and reliable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onSetupContractClick} className="w-full sm:w-auto">
              Set up payment contract
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (isAwardedDigger) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              You’ve been awarded this gig
            </CardTitle>
            <CardDescription>
              The client is setting up the payment contract. Once it’s ready, you’ll see milestones here and can submit each one when that part of the work is done. You get paid when they approve—no fees from your payout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Check back soon or refresh the page after the client completes setup.</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (!isGigger && !isDigger) return null;

  const paidCount = contract.milestone_payments.filter((m) => m.status === "paid").length;
  const totalCount = contract.milestone_payments.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment & milestones
        </CardTitle>
        <CardDescription className="space-y-1">
          {isGigger ? (
            <>
              <span className="block">Approve and pay each milestone when the professional delivers. You pay a 3% transaction fee per payment (Gigger total = milestone + 3%); the professional receives milestone minus 8% platform fee; you’re only charged when you click “Approve & pay”.</span>
              <span className="block text-xs flex items-center gap-1.5 mt-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Payments are secure (Stripe). The professional is paid as soon as you approve.
              </span>
            </>
          ) : (
            <>
              <span className="block">Submit each milestone when that part of the work is done. You receive the milestone amount minus 8% platform fee when the client approves.</span>
              <span className="block text-xs flex items-center gap-1.5 mt-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Secure payouts via Stripe. Ensure your payout account is set up in Settings or My Bids to get paid.
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {isGigger
              ? `${paidCount} of ${totalCount} milestone${totalCount === 1 ? "" : "s"} paid. When the Digger submits one, you’ll see “Approve & pay” here.`
              : `${paidCount} of ${totalCount} milestone${totalCount === 1 ? "" : "s"} paid. Submit when ready; the client pays you after they approve.`}
          </p>
        )}

        <TooltipProvider>
          {contract.milestone_payments.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 bg-muted/20"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Milestone {m.milestone_number}</span>
                  <Badge
                    variant={
                      m.status === "paid"
                        ? "default"
                        : m.status === "submitted"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {m.status === "paid"
                      ? "Paid"
                      : m.status === "submitted"
                        ? (isGigger ? "Ready for you to pay" : "Waiting for client to pay")
                        : isDigger
                          ? "Waiting for you to submit"
                          : "Waiting for Digger"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                <p className="text-sm font-medium mt-1">
                  ${Number(m.amount).toFixed(2)}
                  {m.status === "paid" && m.released_at && (
                    <span className="text-muted-foreground font-normal ml-2">
                      · Paid {new Date(m.released_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {m.status === "pending" && isDigger && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSubmitMilestone(m.id)}
                        disabled={!!submittingId}
                      >
                        {submittingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Submit for review
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[220px]">
                      Mark this milestone as done and notify the client. They’ll review and pay you when they approve.
                    </TooltipContent>
                  </Tooltip>
                )}
                {m.status === "submitted" && isGigger && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => handleApproveAndPay(m.id)}
                        disabled={!!payingId}
                      >
                        {payingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve & pay
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[220px]">
                      Charge your card (milestone + 3% transaction fee). The professional receives the milestone minus 8% platform fee.
                    </TooltipContent>
                  </Tooltip>
                )}
                {m.status === "paid" && (
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Paid
                  </span>
                )}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
