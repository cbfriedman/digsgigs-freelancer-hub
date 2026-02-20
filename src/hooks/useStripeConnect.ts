import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";

export const useStripeConnect = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [canReceivePayments, setCanReceivePayments] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkConnectStatus();
  }, []);

  const checkConnectStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("digger_profiles")
        .select("stripe_connect_account_id, stripe_connect_onboarded, stripe_connect_charges_enabled")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setIsOnboarded(profile.stripe_connect_onboarded || false);
        setCanReceivePayments(profile.stripe_connect_charges_enabled || false);
      }
    } catch (error) {
      console.error("Error checking Connect status:", error);
    } finally {
      setLoading(false);
    }
  };

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
        (raw.includes("signed up for Connect") || raw.includes("stripe.com/docs/connect"));
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
    createConnectAccount,
    checkConnectStatus,
  };
};