import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { useStripeConfig } from "@/hooks/useStripeConfig";

export const useStripeConnect = () => {
  const { toast } = useToast();
  const { stripeMode } = useStripeConfig();
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [canReceivePayments, setCanReceivePayments] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fetchIdRef = useRef(0);

  const checkConnectStatus = useCallback(async () => {
    const thisFetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("digger_profiles")
        .select("stripe_connect_account_id, stripe_connect_onboarded, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_onboarded_live, stripe_connect_charges_enabled_live")
        .eq("user_id", user.id)
        .maybeSingle();

      if (thisFetchId !== fetchIdRef.current) return;

      if (profileError) {
        console.error("Error fetching digger profile:", profileError);
        setIsOnboarded(false);
        setCanReceivePayments(false);
      } else if (profile) {
        const p = profile as unknown as Record<string, unknown>;
        const isLive = stripeMode === "live";
        setIsOnboarded(!!(isLive ? (p.stripe_connect_onboarded_live || p.stripe_connect_account_id_live) : (p.stripe_connect_onboarded || p.stripe_connect_account_id)));
        setCanReceivePayments(!!(isLive ? p.stripe_connect_charges_enabled_live : p.stripe_connect_charges_enabled));
      } else {
        setIsOnboarded(false);
        setCanReceivePayments(false);
      }
    } catch (error) {
      if (thisFetchId !== fetchIdRef.current) return;
      console.error("Error checking Connect status:", error);
      setIsOnboarded(false);
      setCanReceivePayments(false);
    } finally {
      if (thisFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [stripeMode]);

  useEffect(() => {
    checkConnectStatus();
  }, [checkConnectStatus]);

  /** Sync Connect account status from Stripe to the platform (confirm payout account). */
  const syncWithStripe = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await invokeEdgeFunction<{ synced?: boolean; error?: string; message?: string }>(
        supabase,
        "sync-connect-status"
      );
      if (data?.error === "no_connect_account") {
        toast({
          title: "No payout account",
          description: data?.message ?? "Connect your payout account first.",
          variant: "destructive",
        });
        return;
      }
      if (data?.synced) {
        await checkConnectStatus();
        toast({
          title: "Payout status updated",
          description: "Your payout account status has been synced with the platform.",
        });
      } else if (data?.error) {
        toast({
          title: "Could not confirm",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const msg = error?.message ?? "Failed to confirm payout status";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [toast, checkConnectStatus]);

  const createConnectAccount = async () => {
    setCreating(true);
    try {
      const data = await invokeEdgeFunction<{ url?: string }>(supabase, "create-connect-account");

      if (data?.url) {
        // Redirect the top-level window so Stripe never loads inside a frame (avoids frame-ancestors errors). Essential if the app is embedded (e.g. in an editor preview).
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          // Cross-origin iframe: can't set top. Open in same window via link with target="_top"
          const a = document.createElement("a");
          a.href = data.url;
          a.rel = "noopener noreferrer";
          (a as HTMLAnchorElement).target = "_top";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        throw new Error("No redirect URL returned");
      }
    } catch (error: any) {
      console.error("Error creating Connect account:", error);
      const raw = error?.message || "Failed to create Stripe Connect account";
      const isConnectNotEnabled =
        typeof raw === "string" &&
        raw.includes("signed up for Connect");
      const description = isConnectNotEnabled
        ? "Payment setup is not complete yet. The platform needs to enable Stripe Connect in the Stripe Dashboard (Connect → Get started). Please try again later or contact support."
        : raw;
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  return {
    loading,
    isOnboarded,
    canReceivePayments,
    creating,
    syncing,
    createConnectAccount,
    checkConnectStatus,
    syncWithStripe,
  };
};