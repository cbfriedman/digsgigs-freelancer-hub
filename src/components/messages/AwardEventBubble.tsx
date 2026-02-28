import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Trophy, CheckCircle, XCircle, Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";

export interface AwardEventMetadata {
  _type: "award_event";
  event: "awarded" | "accepted" | "declined" | "cancelled";
  bid_id?: string | null;
  gig_id?: string | null;
  amount?: number | null;
}

interface AwardEventBubbleProps {
  event: "awarded" | "accepted" | "declined" | "cancelled";
  timestamp: string;
  bidId?: string | null;
  gigId?: string | null;
  amount?: number | null;
  /** Current user is the Digger (can accept/decline when event is awarded) */
  isDigger: boolean;
  /** Digger profile id for this conversation - used to fetch bid when needed */
  diggerId?: string | null;
  /** When true, parent knows this bid was accepted (e.g. optimistic update from top bar) – disables Accept/Decline without refetch */
  bidAccepted?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function AwardEventBubble({
  event,
  timestamp,
  bidId,
  gigId,
  amount,
  isDigger,
  diggerId: diggerIdProp,
  bidAccepted: bidAcceptedFromParent,
  onAccept,
  onDecline,
}: AwardEventBubbleProps) {
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    if (event !== "awarded" || !isDigger || !bidId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bids")
        .select("status, pricing_model")
        .eq("id", bidId)
        .single();
      if (cancelled) return;
      const bid = data as { status?: string; pricing_model?: string } | null;
      const accepted = bid?.status === "accepted";
      const isExclusive = bid?.pricing_model === "success_based";
      setAlreadyAccepted(!!accepted);
      setRequiresAcceptance(!!isExclusive);
    })();
    return () => { cancelled = true; };
  }, [event, isDigger, bidId]);

  const timeStr = format(new Date(timestamp), "h:mm a");
  const amountStr = amount != null && !isNaN(amount) ? `$${Number(amount).toLocaleString()}` : null;

  const handleAccept = async () => {
    if (!bidId || !gigId) return;
    const diggerId = diggerIdProp ?? (await getDiggerIdFromBid(bidId));
    if (!diggerId) {
      toast({ title: "Error", description: "Could not find bid", variant: "destructive" });
      return;
    }
    setAccepting(true);
    try {
      const data = await invokeEdgeFunction<{ requiresPayment?: boolean; checkoutUrl?: string }>(
        supabase,
        "digger-accept-award",
        { body: { bidId, gigId, diggerId } }
      );
      if (data?.requiresPayment && data?.checkoutUrl) {
        toast({ title: "Payment Required", description: "Redirecting to payment page..." });
        window.open(data.checkoutUrl, "_blank");
      } else {
        toast({ title: "Job Accepted!", description: "You've accepted this job. Time to start work!" });
      }
      setAlreadyAccepted(true);
      onAccept?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to accept", variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!bidId || !gigId) return;
    if (alreadyAccepted) {
      toast({ title: "Already accepted", description: "You cannot decline after accepting this award.", variant: "destructive" });
      return;
    }
    const diggerId = diggerIdProp ?? (await getDiggerIdFromBid(bidId));
    if (!diggerId) {
      toast({ title: "Error", description: "Could not find bid", variant: "destructive" });
      return;
    }
    setDeclining(true);
    try {
      await invokeEdgeFunction(supabase, "digger-decline-award", {
        body: { bidId, gigId, diggerId, reason: "Declined from chat" },
      });
      toast({ title: "Award declined", description: "The client has been notified." });
      onDecline?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to decline", variant: "destructive" });
    } finally {
      setDeclining(false);
    }
  };

  const accepted = alreadyAccepted || !!bidAcceptedFromParent;
  const showAcceptDecline = event === "awarded" && isDigger && requiresAcceptance;

  return (
    <div className="flex justify-center my-3">
      <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/30 px-4 py-3 max-w-[90%]">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          {event === "awarded" && <Trophy className="h-5 w-5 shrink-0" aria-label="Awarded" />}
          {event === "accepted" && <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" aria-label="Accepted" />}
          {event === "declined" && <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Declined" />}
          {event === "cancelled" && <Ban className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Cancelled" />}
          <span className="text-sm font-medium">
            {event === "awarded" && (isDigger ? "You're awarded!" : "You awarded this gig")}
            {event === "accepted" && (isDigger ? "You accepted the award" : "The freelancer accepted the award")}
            {event === "declined" && "The freelancer declined the award"}
            {event === "cancelled" && "The client cancelled the award"}
          </span>
        </div>
        {amountStr && event !== "declined" && (
          <span className="text-xs text-muted-foreground">{amountStr}</span>
        )}
        {showAcceptDecline && (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={accepting || declining || accepted}
            >
              {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleDecline}
              disabled={accepting || declining || accepted}
              title={accepted ? "Cannot decline after accepting" : undefined}
            >
              {declining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Decline
            </Button>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">{timeStr}</span>
      </div>
    </div>
  );
}

async function getDiggerIdFromBid(bidId: string): Promise<string | null> {
  const { data } = await supabase.from("bids").select("digger_id").eq("id", bidId).single();
  return (data as { digger_id?: string } | null)?.digger_id ?? null;
}
