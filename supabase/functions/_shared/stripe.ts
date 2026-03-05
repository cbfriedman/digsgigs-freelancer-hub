/**
 * Shared Stripe config for Edge Functions. Reads stripe_mode from platform_settings
 * and returns the appropriate secret key and webhook secrets (test vs live).
 * Set in Supabase secrets: STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE,
 * STRIPE_WEBHOOK_SECRET_TEST, STRIPE_WEBHOOK_SECRET_LIVE, etc.
 * Test mode fallback: if _TEST is not set, uses STRIPE_SECRET_KEY.
 * Live mode: only _LIVE keys are used (no fallback), so set STRIPE_SECRET_KEY_LIVE and STRIPE_PUBLISHABLE_KEY_LIVE for live.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export type StripeMode = "test" | "live";

export async function getStripeMode(supabaseAdmin: SupabaseClient): Promise<StripeMode> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("value")
    .eq("key", "stripe_mode")
    .maybeSingle();
  if (error || !data?.value) return "test";
  const v = data.value as { mode?: string };
  return v.mode === "live" ? "live" : "test";
}

function envKey(mode: StripeMode, base: string): string {
  const suffix = mode === "live" ? "_LIVE" : "_TEST";
  const modeKey = Deno.env.get(`${base}${suffix}`);
  // Live mode: only use _LIVE key (never fall back to unsuffixed, which may be test key)
  if (mode === "live") return modeKey || "";
  // Test mode: use _TEST then fallback to unsuffixed for backward compatibility
  return modeKey || Deno.env.get(base) || "";
}

export interface StripeConfig {
  mode: StripeMode;
  secretKey: string;
  webhookSecret: string;
  webhookSecretProfileView: string;
  webhookSecretMilestone: string;
}

export async function getStripeConfig(supabaseAdmin: SupabaseClient): Promise<StripeConfig> {
  const mode = await getStripeMode(supabaseAdmin);
  return {
    mode,
    secretKey: envKey(mode, "STRIPE_SECRET_KEY"),
    webhookSecret: envKey(mode, "STRIPE_WEBHOOK_SECRET"),
    webhookSecretProfileView: envKey(mode, "STRIPE_WEBHOOK_SECRET_PROFILE_VIEW"),
    webhookSecretMilestone: envKey(mode, "STRIPE_WEBHOOK_MILESTONE_SECRET") || envKey(mode, "STRIPE_WEBHOOK_SECRET"),
  };
}

/** Returns publishable key for the current mode (for get-stripe-mode Edge Function). */
export async function getStripePublishableKey(supabaseAdmin: SupabaseClient): Promise<{ mode: StripeMode; publishableKey: string }> {
  const mode = await getStripeMode(supabaseAdmin);
  const suffix = mode === "live" ? "_LIVE" : "_TEST";
  const publishableKey =
    Deno.env.get(`STRIPE_PUBLISHABLE_KEY${suffix}`) ||
    Deno.env.get("STRIPE_PUBLISHABLE_KEY") ||
    "";
  return { mode, publishableKey };
}
