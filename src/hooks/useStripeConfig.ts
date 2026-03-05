import { useState, useEffect, useRef } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

export type StripeMode = "test" | "live";

interface StripeConfigResult {
  stripeMode: StripeMode;
  publishableKey: string | null;
  stripePromise: Promise<Stripe | null> | null;
  loading: boolean;
  error: string | null;
}

let cached: StripeConfigResult | null = null;

export function useStripeConfig(): StripeConfigResult {
  const [state, setState] = useState<StripeConfigResult>(() => ({
    stripeMode: "test",
    publishableKey: null,
    stripePromise: null,
    loading: true,
    error: null,
  }));
  const fetched = useRef(false);

  useEffect(() => {
    if (cached) {
      setState(cached);
      return;
    }
    if (fetched.current) return;
    fetched.current = true;

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-stripe-mode");
        let publishableKey: string | null = (data as { publishableKey?: string })?.publishableKey ?? null;
        const stripeMode: StripeMode = (data as { stripeMode?: string })?.stripeMode === "live" ? "live" : "test";
        if (fnError && !publishableKey) {
          publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? null;
        }
        if (!publishableKey) {
          publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? null;
        }
        const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
        const result: StripeConfigResult = {
          stripeMode,
          publishableKey,
          stripePromise,
          loading: false,
          error: null,
        };
        cached = result;
        setState(result);
      } catch (e) {
        const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? null;
        const result: StripeConfigResult = {
          stripeMode: "test",
          publishableKey: fallbackKey,
          stripePromise: fallbackKey ? loadStripe(fallbackKey) : null,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load Stripe config",
        };
        setState(result);
      }
    })();
  }, []);

  return state;
}

/** Invalidate cache so next useStripeConfig() refetches (e.g. after admin changes mode). */
export function invalidateStripeConfigCache(): void {
  cached = null;
}
