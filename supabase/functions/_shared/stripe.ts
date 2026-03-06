/**
 * Shared Stripe config for Edge Functions. Reads stripe_mode from platform_settings
 * and returns the appropriate secret key and webhook secrets (test vs live).
 * Set in Supabase secrets: STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE,
 * STRIPE_WEBHOOK_SECRET_TEST, STRIPE_WEBHOOK_SECRET_LIVE, etc.
 * Test mode fallback: if _TEST is not set, uses STRIPE_SECRET_KEY.
 * Live mode: only _LIVE keys are used (no fallback), so set STRIPE_SECRET_KEY_LIVE and STRIPE_PUBLISHABLE_KEY_LIVE for live.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.25.0";

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

/** Stripe secret keys must start with sk_test_ or sk_live_ */
const VALID_SECRET_PREFIX = /^sk_(test|live)_/;

export async function getStripeConfig(supabaseAdmin: SupabaseClient): Promise<StripeConfig> {
  const mode = await getStripeMode(supabaseAdmin);
  const rawSecret = envKey(mode, "STRIPE_SECRET_KEY");
  const secretKey = typeof rawSecret === "string" ? rawSecret.trim() : "";

  if (!secretKey) {
    if (mode === "live") {
      throw new Error(
        "Stripe live mode is on but STRIPE_SECRET_KEY_LIVE is not set. " +
        "Add your live secret key (sk_live_...) in Supabase Dashboard → Edge Functions → Secrets."
      );
    }
    throw new Error(
      "Stripe secret key not set. Add STRIPE_SECRET_KEY_TEST or STRIPE_SECRET_KEY in Supabase Dashboard → Edge Functions → Secrets."
    );
  }
  if (!VALID_SECRET_PREFIX.test(secretKey)) {
    throw new Error(
      `Invalid Stripe secret key for ${mode} mode: key must start with sk_test_ or sk_live_. ` +
      `Check that STRIPE_SECRET_KEY${mode === "live" ? "_LIVE" : "_TEST"} is set correctly in Edge Function secrets.`
    );
  }

  return {
    mode,
    secretKey,
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

/** Get secret key for a given mode (for webhooks after verifying which mode sent the event). */
export function getSecretKeyForMode(mode: StripeMode): string {
  return envKey(mode, "STRIPE_SECRET_KEY");
}

export type WebhookSecretKind = "STRIPE_WEBHOOK_SECRET" | "STRIPE_WEBHOOK_SECRET_PROFILE_VIEW" | "STRIPE_WEBHOOK_MILESTONE_SECRET";

/**
 * Verify webhook payload with either TEST or LIVE secret and return event + matching secret key.
 * Use in webhook handlers so they work for both test and live based on which secret validates.
 */
export function verifyWebhookAndGetStripeContext(
  payload: string | Uint8Array,
  signature: string,
  webhookSecretEnvBase: WebhookSecretKind = "STRIPE_WEBHOOK_SECRET"
): { event: Stripe.Event; mode: StripeMode; secretKey: string } | null {
  const secretTest = Deno.env.get(`${webhookSecretEnvBase}_TEST`) || "";
  const secretLive = Deno.env.get(`${webhookSecretEnvBase}_LIVE`) || "";
  for (const [secret, mode] of [[secretTest, "test" as StripeMode], [secretLive, "live" as StripeMode]]) {
    if (!secret) continue;
    try {
      const event = Stripe.webhooks.constructEvent(payload, signature, secret);
      const secretKey = envKey(mode, "STRIPE_SECRET_KEY");
      if (!secretKey) continue;
      return { event, mode, secretKey };
    } catch {
      // try next secret
    }
  }
  return null;
}

/**
 * Async version for Deno: verify with either TEST or LIVE webhook secret using constructEventAsync.
 * Use in webhook handlers for Deno compatibility.
 */
export async function verifyWebhookAndGetStripeContextAsync(
  payload: string,
  signature: string,
  webhookSecretEnvBase: WebhookSecretKind = "STRIPE_WEBHOOK_SECRET"
): Promise<{ event: Stripe.Event; mode: StripeMode; secretKey: string } | null> {
  const secretTest = Deno.env.get(`${webhookSecretEnvBase}_TEST`) || (webhookSecretEnvBase === "STRIPE_WEBHOOK_SECRET" ? Deno.env.get("STRIPE_WEBHOOK_SECRET") || "" : "");
  const secretLive = Deno.env.get(`${webhookSecretEnvBase}_LIVE`) || "";
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  for (const [secret, mode] of [[secretTest, "test" as StripeMode], [secretLive, "live" as StripeMode]]) {
    if (!secret) continue;
    try {
      const event = await Stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, cryptoProvider);
      const secretKey = getSecretKeyForMode(mode);
      if (!secretKey) continue;
      return { event, mode, secretKey };
    } catch {
      // try next secret
    }
  }
  return null;
}
