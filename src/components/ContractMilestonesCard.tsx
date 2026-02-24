import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Send, CreditCard, Shield, Star, RefreshCw, Plus } from "lucide-react";
import { RatingDialog } from "@/components/RatingDialog";
import { GiggerRatingDialog } from "@/components/GiggerRatingDialog";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
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
  /** Callback for Digger to open the "Suggest milestone plan" dialog (when no contract yet). */
  onSuggestMilestoneClick?: () => void;
  /** When 'awarded', Digger view shows Accept/Decline on GigDetail instead of this card. */
  gigStatus?: string | null;
  /** Gig title (for review CTA when contract is completed). */
  gigTitle?: string;
  /** Suggested milestone plan from the awarded bid (so Gigger and Digger can see it before/after suggesting). */
  suggestedMilestonesFromBid?: { description: string; amount: number }[] | null;
}

export function ContractMilestonesCard({
  gigId,
  currentUserId,
  currentDiggerProfileId,
  onUpdate,
  onSetupContractClick,
  onSuggestMilestoneClick,
  gigStatus,
  gigTitle,
  suggestedMilestonesFromBid,
}: ContractMilestonesCardProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contract, setContract] = useState<ContractWithMilestones | null>(null);
  const [gigInfo, setGigInfo] = useState<{ consumer_id: string; awarded_digger_id: string | null } | null>(null);
  /** For exclusive (success_based) gigs: bid amount and whether 15% deposit was paid. Used for first-milestone 7% display. */
  const [exclusiveWithDeposit, setExclusiveWithDeposit] = useState<{ bidAmount: number; depositPaid: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [showConnectPaymentDialog, setShowConnectPaymentDialog] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [endingContract, setEndingContract] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [giggerRatingDialogOpen, setGiggerRatingDialogOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);
  const [addMilestoneDescription, setAddMilestoneDescription] = useState("");
  const [addMilestoneAmount, setAddMilestoneAmount] = useState("");
  const [addMilestoneSubmitting, setAddMilestoneSubmitting] = useState(false);
  type ReviewDisplay = { rating: number; review_text: string | null; created_at: string };
  const [myReview, setMyReview] = useState<ReviewDisplay | null>(null);
  const [theirReview, setTheirReview] = useState<ReviewDisplay | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const isGigger = (contract?.consumer_id ?? gigInfo?.consumer_id) === currentUserId;
  const isAwardedDigger = currentDiggerProfileId && (contract?.digger_id === currentDiggerProfileId || gigInfo?.awarded_digger_id === currentDiggerProfileId);
  const isDigger = !!currentDiggerProfileId && (contract?.digger_id === currentDiggerProfileId || gigInfo?.awarded_digger_id === currentDiggerProfileId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Parallel: contract + gig row (needed for both no-contract and exclusive logic)
      const [contractRes, gigRes] = await Promise.all([
        supabase
          .from("escrow_contracts")
          .select("id, consumer_id, digger_id, total_amount, status")
          .eq("gig_id", gigId)
          .in("status", ["active", "completed"])
          .maybeSingle(),
        supabase.from("gigs").select("consumer_id, awarded_digger_id, awarded_bid_id").eq("id", gigId).single(),
      ]);

      if (cancelled) return;

      const { data: contractRow, error: contractError } = contractRes;
      const { data: gigRow } = gigRes;

      if (contractError || !contractRow) {
        setContract(null);
        if (!contractRow && gigRow) setGigInfo({ consumer_id: gigRow.consumer_id, awarded_digger_id: gigRow.awarded_digger_id });
        else setGigInfo(null);
        setLoading(false);
        return;
      }

      // Contract exists: fetch milestones and (for exclusive) bid + deposit in parallel
      const bidId = gigRow?.awarded_bid_id;
      const [milestonesRes, ...exclusiveRes] = await Promise.all([
        supabase
          .from("milestone_payments")
          .select("id, milestone_number, description, amount, status, stripe_payment_intent_id, released_at")
          .eq("escrow_contract_id", contractRow.id)
          .order("milestone_number", { ascending: true }),
        bidId
          ? supabase.from("bids").select("amount, pricing_model").eq("id", bidId).single()
          : Promise.resolve({ data: null }),
        bidId
          ? supabase.from("gigger_deposits").select("id").eq("bid_id", bidId).eq("status", "paid").maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      const { data: milestones, error: milestonesError } = milestonesRes;
      if (milestonesError) {
        setContract(null);
        setGigInfo(null);
        setExclusiveWithDeposit(null);
        setLoading(false);
        return;
      }

      let exclusive: { bidAmount: number; depositPaid: boolean } | null = null;
      if (bidId && exclusiveRes[0]?.data) {
        const bidRow = exclusiveRes[0].data as { amount?: number; pricing_model?: string } | null;
        const depositRow = exclusiveRes[1]?.data;
        if (bidRow?.pricing_model === "success_based" && bidRow?.amount != null) {
          exclusive = { bidAmount: bidRow.amount, depositPaid: !!depositRow };
        }
      }
      if (!cancelled) setExclusiveWithDeposit(exclusive);

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
  }, [gigId, onUpdate, reloadKey]);

  // Refetch when returning from milestone Checkout: confirm session (fallback if webhook delayed) then refetch
  useEffect(() => {
    const milestonePaid = searchParams.get("milestone_paid");
    const sessionId = searchParams.get("session_id");
    if (milestonePaid !== "true" || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await invokeEdgeFunction<{ success?: boolean; alreadyCompleted?: boolean; error?: string }>(
          supabase,
          "confirm-milestone-session",
          { body: { session_id: sessionId } }
        );
        if (cancelled) return;
        if (result?.success) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("milestone_paid");
            next.delete("session_id");
            return next;
          }, { replace: true });
          setReloadKey((k) => k + 1);
          onUpdate?.();
          if (!result.alreadyCompleted) {
            toast({ title: "Payment confirmed", description: "The professional will receive this milestone amount." });
          }
        } else if (result?.error) {
          toast({ title: "Could not confirm payment", description: result.error, variant: "destructive" });
        }
      } catch {
        if (!cancelled) {
          toast({
            title: "Could not confirm payment",
            description: "Please refresh the page. If you paid, the milestone will still be marked as paid.",
            variant: "destructive",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, setSearchParams, onUpdate, toast]);

  // Fetch hasPaymentMethod for Giggers
  const fetchHasPaymentMethod = useCallback(async () => {
    try {
      const data = await invokeEdgeFunction<{ paymentMethods?: unknown[] }>(supabase, "manage-payment-methods", { method: "GET" });
      setHasPaymentMethod((data?.paymentMethods?.length ?? 0) > 0);
    } catch {
      setHasPaymentMethod(false);
    }
  }, []);

  useEffect(() => {
    if (isGigger && contract) {
      fetchHasPaymentMethod();
    }
  }, [isGigger, contract?.id, fetchHasPaymentMethod]);

  const fetchCompletedReviews = useCallback(
    async (showLoading = true) => {
      if (!contract || contract.status !== "completed") return;
      if (showLoading) setReviewsLoading(true);
      const timeoutId = showLoading
        ? window.setTimeout(() => setReviewsLoading(false), 4000)
        : undefined;
      try {
        if (isGigger) {
          const { data: myRow, error: myError } = await supabase
            .from("ratings")
            .select("rating, review_text, created_at")
            .eq("consumer_id", currentUserId)
            .eq("gig_id", gigId)
            .eq("digger_id", contract.digger_id)
            .maybeSingle();
          if (myError) {
            console.error("[ContractMilestonesCard] ratings fetch error:", myError.message, myError.code);
          }
          setMyReview(myRow ? { rating: myRow.rating, review_text: myRow.review_text, created_at: myRow.created_at } : null);
          const { data: theirRow, error: theirError } = await supabase
            .from("gigger_ratings")
            .select("rating, review_text, created_at")
            .eq("gig_id", gigId)
            .eq("digger_id", contract.digger_id)
            .eq("consumer_id", contract.consumer_id)
            .maybeSingle();
          if (theirError) {
            console.error("[ContractMilestonesCard] gigger_ratings fetch error:", theirError.message, theirError.code);
          }
          setTheirReview(theirRow ? { rating: theirRow.rating, review_text: theirRow.review_text, created_at: theirRow.created_at } : null);
        } else {
          const { data: myRow, error: myError } = await supabase
            .from("gigger_ratings")
            .select("rating, review_text, created_at")
            .eq("gig_id", gigId)
            .eq("digger_id", contract.digger_id)
            .eq("consumer_id", contract.consumer_id)
            .maybeSingle();
          if (myError) {
            console.error("[ContractMilestonesCard] gigger_ratings (my) fetch error:", myError.message, myError.code);
          }
          setMyReview(myRow ? { rating: myRow.rating, review_text: myRow.review_text, created_at: myRow.created_at } : null);
          const { data: theirRow, error: theirError } = await supabase
            .from("ratings")
            .select("rating, review_text, created_at")
            .eq("gig_id", gigId)
            .eq("digger_id", contract.digger_id)
            .eq("consumer_id", contract.consumer_id)
            .maybeSingle();
          if (theirError) {
            console.error("[ContractMilestonesCard] ratings (their) fetch error:", theirError.message, theirError.code);
          }
          setTheirReview(theirRow ? { rating: theirRow.rating, review_text: theirRow.review_text, created_at: theirRow.created_at } : null);
        }
      } catch (e) {
        console.error("Error fetching completed reviews:", e);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        setReviewsLoading(false);
      }
    },
    [contract, gigId, currentUserId, isGigger]
  );

  const fetchCompletedReviewsRef = useRef(fetchCompletedReviews);
  fetchCompletedReviewsRef.current = fetchCompletedReviews;

  useEffect(() => {
    if (contract?.status === "completed") {
      fetchCompletedReviewsRef.current(true);
    } else {
      setMyReview(null);
      setTheirReview(null);
      setReviewsLoading(false);
    }
  }, [contract?.status, contract?.id]);

  // Realtime: when the other party leaves a review, show it without refresh (gigger sees digger's review, digger sees gigger's review)
  useEffect(() => {
    if (!contract || contract.status !== "completed" || !gigId) return;

    const channel = supabase
      .channel(`contract-reviews:${gigId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ratings", filter: `gig_id=eq.${gigId}` },
        () => fetchCompletedReviewsRef.current(false)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ratings", filter: `gig_id=eq.${gigId}` },
        () => fetchCompletedReviewsRef.current(false)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gigger_ratings", filter: `gig_id=eq.${gigId}` },
        () => fetchCompletedReviewsRef.current(false)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gigger_ratings", filter: `gig_id=eq.${gigId}` },
        () => fetchCompletedReviewsRef.current(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contract?.status, gigId]);

  const handleSubmitMilestone = async (milestoneId: string) => {
    setSubmittingId(milestoneId);
    try {
      await invokeEdgeFunction(supabase, "submit-milestone", {
        body: { milestonePaymentId: milestoneId },
      });
      toast({ title: "Submitted", description: "Milestone sent for client approval." });
      setContract((c) => {
        if (!c) return c;
        return {
          ...c,
          milestone_payments: c.milestone_payments.map((m) =>
            m.id === milestoneId ? { ...m, status: "submitted" } : m
          ),
        };
      });
      // Don't call onUpdate here—it would remount the card and show full loading. Optimistic update above is enough.
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

  const handleApproveAndPay = async (milestoneId: string, useCheckout?: boolean) => {
    setPayingId(milestoneId);
    try {
      const data = await invokeEdgeFunction<{
        requiresAction?: boolean;
        clientSecret?: string;
        success?: boolean;
        requiresPayment?: boolean;
        checkoutUrl?: string;
      }>(supabase, "charge-milestone", {
        body: {
          milestonePaymentId: milestoneId,
          useCheckout: useCheckout ?? false,
          origin: window.location.origin,
        },
      });

      if (data?.requiresPayment && data?.checkoutUrl) {
        toast({
          title: "Redirecting to payment",
          description: "Complete payment on the next page. You'll return here when done.",
        });
        window.location.href = data.checkoutUrl;
        setPayingId(null);
        return;
      }

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
        setPayingId(null);
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
      const message = e instanceof Error ? e.message : "Something went wrong";
      const isInsufficientFunds = /insufficient|available balance|balance_insufficient/i.test(message);
      toast({
        title: "Payment failed",
        description: isInsufficientFunds
          ? "Saved card payment couldn't be completed. Please use \"Pay with new card (Checkout)\" instead—it works reliably."
          : message,
        variant: "destructive",
      });
    } finally {
      setPayingId(null);
    }
  };

  const handleEndContract = async () => {
    if (!contract || contract.status === "completed") return;
    setEndingContract(true);
    try {
      const data = await invokeEdgeFunction<{ success?: boolean; error?: string }>(supabase, "end-contract", {
        body: { gigId },
      });
      if (data?.success) {
        toast({
          title: "Contract ended",
          description: "You and the professional can now leave reviews for each other in Transaction history.",
        });
        setReloadKey((k) => k + 1);
        onUpdate?.();
        setContract((c) => (c ? { ...c, status: "completed" } : c));
      } else {
        toast({
          title: "Could not end contract",
          description: data?.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to end contract",
        variant: "destructive",
      });
    } finally {
      setEndingContract(false);
    }
  };

  const handleAddMilestone = async () => {
    const desc = addMilestoneDescription.trim();
    const amount = parseFloat(addMilestoneAmount);
    if (!desc) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount greater than 0", variant: "destructive" });
      return;
    }
    setAddMilestoneSubmitting(true);
    try {
      await invokeEdgeFunction(supabase, "add-milestone", {
        body: { gigId, description: desc, amount },
      });
      toast({
        title: "Milestone added",
        description: "The professional can submit it when the work is done; you'll pay when you approve.",
      });
      setAddMilestoneOpen(false);
      setAddMilestoneDescription("");
      setAddMilestoneAmount("");
      setReloadKey((k) => k + 1);
      onUpdate?.();
    } catch (e) {
      toast({
        title: "Could not add milestone",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddMilestoneSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment & milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <p className="text-sm">Loading…</p>
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
              Set up the payment contract (milestones) so you can pay per milestone when you approve the work. Funds are held by the platform until you approve—you’re only charged when you click “Approve & pay” (3% per payment; Digger receives milestone minus 8% platform fee). Secure and reliable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedMilestonesFromBid && suggestedMilestonesFromBid.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-medium">Suggested plan by the professional</p>
                <ul className="space-y-1.5 text-sm">
                  {suggestedMilestonesFromBid.map((m, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{m.description || `Milestone ${i + 1}`}</span>
                      <span className="font-medium tabular-nums">${Number(m.amount).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    ${suggestedMilestonesFromBid.reduce((s, m) => s + (m.amount ?? 0), 0).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            <Button onClick={onSetupContractClick} className="w-full sm:w-auto">
              Set up payment contract
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (isAwardedDigger) {
      const hasSuggested = suggestedMilestonesFromBid && suggestedMilestonesFromBid.length > 0;
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & milestones
            </CardTitle>
            <CardDescription>
              Only the client can create the payment contract. You can suggest a milestone plan for them to accept. Once they create the contract, you'll see milestones here and can submit each one when that part of the work is done. Funds are held by the platform until the client approves—you get paid when they approve each milestone (minus 8% platform fee).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasSuggested && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-medium">Your suggested plan</p>
                <ul className="space-y-1.5 text-sm">
                  {suggestedMilestonesFromBid!.map((m, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{m.description || `Milestone ${i + 1}`}</span>
                      <span className="font-medium tabular-nums">${Number(m.amount).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    ${suggestedMilestonesFromBid!.reduce((s, m) => s + (m.amount ?? 0), 0).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            {onSuggestMilestoneClick ? (
              <Button onClick={onSuggestMilestoneClick} className="w-full sm:w-auto" variant={hasSuggested ? "outline" : "default"}>
                {hasSuggested ? "Edit suggested plan" : "Suggest milestone plan"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Check back after the client creates the contract.</p>
            )}
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
              <span className="block">Approve and pay each milestone when the professional delivers. You pay a 3% transaction fee per payment (Gigger total = milestone + 3%). {exclusiveWithDeposit
                  ? "The professional receives the full milestone amount (8% was from your 15% deposit); first milestone includes 7% deposit advance (from your deposit, no extra charge)."
                  : "The professional receives milestone minus 8% platform fee. You're only charged when you click \"Approve & pay\"."}</span>
              <span className="block text-xs mt-2 text-muted-foreground">
                <strong className="text-foreground">Checkout (recommended):</strong> Most reliable — professional gets paid every time. You complete payment on the next page. <strong className="text-foreground">Saved card:</strong> One click, no redirect; may fail in some cases (use Checkout if so).
              </span>
              <span className="block text-xs flex items-center gap-1.5 mt-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Payments are secure (Stripe). The professional is paid as soon as you approve.
              </span>
            </>
          ) : (
            <>
              <span className="block">
                {exclusiveWithDeposit
                  ? "Submit each milestone when that part of the work is done. You receive the full milestone amount when the client approves (8% platform fee was from their 15% deposit). First milestone approval includes 7% deposit advance."
                  : "Submit each milestone when that part of the work is done. You receive the milestone amount minus 8% platform fee when the client approves."}
              </span>
              <span className="block text-xs mt-2 text-muted-foreground">
                <strong className="text-foreground">When the client pays via Checkout</strong> you receive funds most reliably. Saved-card payments can occasionally fail; the client can use Checkout instead.
              </span>
              <span className="block text-xs flex items-center gap-1.5 mt-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Secure payouts via Stripe. Set up your payout account in Account or My Bids to get paid.
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount > 0 && contract.status !== "completed" && (
          <p className="text-xs text-muted-foreground">
            {isGigger
              ? `${paidCount} of ${totalCount} milestone${totalCount === 1 ? "" : "s"} paid. When the Digger submits one, you’ll see “Approve & pay” here.`
              : `${paidCount} of ${totalCount} milestone${totalCount === 1 ? "" : "s"} paid. Submit when ready; the client pays you after they approve.`}
          </p>
        )}

        {contract.status === "completed" && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3 space-y-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Contract ended</p>
            {reviewsLoading ? (
              <p className="text-xs text-muted-foreground">Loading reviews…</p>
            ) : !myReview ? (
              <>
                <p className="text-xs text-muted-foreground">
                  You can leave a review and rating for each other (one per gig). Reviews are visible to each other only after both have submitted.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {isGigger ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setRatingDialogOpen(true)}
                    >
                      <Star className="h-4 w-4" />
                      Rate professional
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setGiggerRatingDialogOpen(true)}
                    >
                      <Star className="h-4 w-4" />
                      Rate client
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => fetchCompletedReviews(true)}
                    disabled={reviewsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${reviewsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-green-800 dark:text-green-200">Review & rating</p>
                <div className="space-y-2 text-sm">
                  <div className="rounded border bg-background/80 p-2.5">
                    <p className="font-medium text-muted-foreground mb-1">Your review</p>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i <= myReview.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    {myReview.review_text && <p className="text-foreground">{myReview.review_text}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(myReview.created_at).toLocaleDateString()}</p>
                  </div>
                  {theirReview && (
                    <div className="rounded border bg-background/80 p-2.5">
                      <p className="font-medium text-muted-foreground mb-1">{isGigger ? "Professional's review" : "Client's review"}</p>
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i <= theirReview.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      {theirReview.review_text && <p className="text-foreground">{theirReview.review_text}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(theirReview.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                  {exclusiveWithDeposit && m.milestone_number === 1 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      (+ 7% deposit advance: ${(exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)})
                    </span>
                  )}
                  {m.status === "paid" && m.released_at && (
                    <span className="text-muted-foreground font-normal ml-2">
                      · Paid {new Date(m.released_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
                {/* First milestone: one clear line for 7% */}
                {exclusiveWithDeposit && m.milestone_number === 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    7% deposit advance: ${(exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} — {isGigger ? "From your 15% deposit, released to the professional when you approve this first milestone (no extra charge)." : "From the client's 15% deposit, released to you when they approve this first milestone."}
                  </p>
                )}
                {exclusiveWithDeposit && exclusiveWithDeposit.depositPaid && m.milestone_number === 1 && m.status === "paid" && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 font-medium">
                    {isDigger
                      ? `You received $${(Number(m.amount) + exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} (milestone + 7% deposit)`
                      : `Professional received $${(Number(m.amount) + exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} (milestone + 7% deposit)`}
                  </p>
                )}
                {exclusiveWithDeposit && exclusiveWithDeposit.depositPaid && m.milestone_number === 1 && m.status !== "paid" && (
                  <p className="text-sm font-medium text-foreground mt-1.5">
                    {isDigger
                      ? `You receive $${(Number(m.amount) + exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} on approval (milestone + 7% deposit).`
                      : `When you approve: professional receives $${Number(m.amount).toFixed(2)} (milestone) + $${(exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} (7% deposit) = $${(Number(m.amount) + exclusiveWithDeposit.bidAmount * 0.07).toFixed(2)} total.`}
                  </p>
                )}
                {/* Gigger: spell out that professional gets milestone + 7% so it’s obvious */}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => handleApproveAndPay(m.id, true)}
                          disabled={!!payingId}
                          className="bg-primary"
                        >
                          {payingId === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve & pay
                              <span className="ml-1.5 text-xs opacity-90">(Checkout)</span>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[260px]">
                        <p className="font-medium">Recommended</p>
                        <p className="text-xs mt-0.5">Most reliable — professional gets paid every time. You’ll complete payment on the next page.</p>
                      </TooltipContent>
                    </Tooltip>
                    {hasPaymentMethod ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveAndPay(m.id, false)}
                            disabled={!!payingId}
                          >
                            {payingId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-1" />
                                Use saved card
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[260px]">
                          <p className="font-medium">One click, no redirect</p>
                          <p className="text-xs mt-0.5">May fail in some cases; use Approve & pay (Checkout) if that happens.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowConnectPaymentDialog(true)}
                            disabled={!!payingId}
                            className="text-muted-foreground"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Connect payment method
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[260px]">
                          <p className="font-medium">For quick payments later</p>
                          <p className="text-xs mt-0.5">Save a card to pay with one click, no redirect. Optional — you can always use Approve & pay (Checkout).</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
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

        {isGigger && contract.status === "active" && (
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAddMilestoneOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add milestone
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">
              Add an extra deliverable and amount. The professional can submit it when done; you pay when you approve.
            </p>
          </div>
        )}

        {paidCount === totalCount && totalCount > 0 && isGigger && contract.status === "active" && (
          <div className="pt-2 border-t">
            <Button
              onClick={handleEndContract}
              disabled={endingContract}
              variant="default"
              className="gap-2"
            >
              {endingContract ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              End contract
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">
              Ending the contract lets you and the professional leave reviews for each other. You can still view this gig and transaction history.
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
            <DialogDescription>
              Add an extra deliverable to this contract. Enter a description and amount. The professional can submit it when the work is done; you'll be charged (milestone + 3% fee) when you approve. Secure and reliable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-milestone-desc">Description</Label>
              <Textarea
                id="add-milestone-desc"
                placeholder="e.g. Phase 2: Revisions and polish"
                value={addMilestoneDescription}
                onChange={(e) => setAddMilestoneDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-milestone-amount">Amount ($)</Label>
              <Input
                id="add-milestone-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={addMilestoneAmount}
                onChange={(e) => setAddMilestoneAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMilestoneOpen(false)} disabled={addMilestoneSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddMilestone} disabled={addMilestoneSubmitting}>
              {addMilestoneSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add milestone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConnectPaymentDialog} onOpenChange={setShowConnectPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Connect payment method
            </DialogTitle>
            <DialogDescription>
              Save a card for quick, one-click payments when you approve milestones—no redirect to a payment page. Optional; you can always use Approve & pay (Checkout) instead.
            </DialogDescription>
          </DialogHeader>
          <PaymentMethodForm
            onSuccess={() => {
              setShowConnectPaymentDialog(false);
              fetchHasPaymentMethod();
              toast({ title: "Payment method added", description: "You can now use \"Use saved card\" for one-click payments on milestones." });
            }}
            onCancel={() => setShowConnectPaymentDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {contract.status === "completed" && (
        <>
          <RatingDialog
            open={ratingDialogOpen}
            onOpenChange={(open) => {
              setRatingDialogOpen(open);
              if (!open) {
                setTimeout(() => fetchCompletedReviews(false), 400);
              }
            }}
            diggerId={contract.digger_id}
            gigId={gigId}
            gigTitle={gigTitle ?? "this gig"}
            onSuccess={() => {
              toast({ title: "Review submitted", description: "Thanks for your feedback." });
              setTimeout(() => fetchCompletedReviews(false), 400);
            }}
          />
          <GiggerRatingDialog
            open={giggerRatingDialogOpen}
            onOpenChange={(open) => {
              setGiggerRatingDialogOpen(open);
              if (!open) {
                setTimeout(() => fetchCompletedReviews(false), 400);
              }
            }}
            consumerId={contract.consumer_id}
            gigId={gigId}
            diggerId={contract.digger_id}
            gigTitle={gigTitle ?? "this gig"}
            onSuccess={() => {
              toast({ title: "Review submitted", description: "Thanks for your feedback." });
              setTimeout(() => fetchCompletedReviews(false), 400);
            }}
          />
        </>
      )}
    </Card>
  );
}
