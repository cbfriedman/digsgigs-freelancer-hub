/**
 * Shared Stripe config for Edge Functions. Reads stripe_mode from platform_settings
 * and returns the appropriate secret key and webhook secrets (test vs live).
 * Set in Supabase secrets: STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE,
 * STRIPE_WEBHOOK_SECRET_TEST, STRIPE_WEBHOOK_SECRET_LIVE, etc.
 * Fallback: if _TEST/_LIVE are not set, uses STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
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
  return Deno.env.get(`${base}${suffix}`) || Deno.env.get(base) || "";
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
