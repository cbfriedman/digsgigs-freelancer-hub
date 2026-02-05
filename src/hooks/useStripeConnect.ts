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
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL returned");
      }
    } catch (error: any) {
      console.error("Error creating Connect account:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create Stripe Connect account",
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