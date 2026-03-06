import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyWebhookAndGetStripeContextAsync } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-GEO-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No Stripe signature found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.text();
    const ctx = await verifyWebhookAndGetStripeContextAsync(body, signature, "STRIPE_WEBHOOK_SECRET");
    if (!ctx) {
      logStep("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { event } = ctx;
    const stripe = new Stripe(ctx.secretKey, { apiVersion: "2025-08-27.basil" });

    logStep("Event received", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process subscription checkouts with our metadata
      if (session.mode !== "subscription" || !session.metadata?.digger_profile_id) {
        logStep("Not a geo subscription checkout, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const {
        digger_profile_id,
        geographic_tier,
        industry_type,
        billing_cycle,
        original_price_cents,
      } = session.metadata;

      logStep("Processing subscription activation", {
        digger_profile_id,
        geographic_tier,
        industry_type,
        billing_cycle,
      });

      // Get the subscription ID from the session
      const subscriptionId = session.subscription as string;

      // Update digger profile with subscription details
      const { error: updateError } = await supabaseClient
        .from('digger_profiles')
        .update({
          geographic_tier,
          industry_type,
          billing_cycle,
          subscription_status: 'active',
          subscription_tier: `${geographic_tier}_${industry_type}`,
          subscription_start_date: new Date().toISOString(),
          original_price_cents: parseInt(original_price_cents || '0'),
          price_locked: true,
          price_lock_notified_30d: false,
          price_lock_notified_7d: false,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
        })
        .eq('id', digger_profile_id);

      if (updateError) {
        logStep("Error updating digger profile", { error: updateError });
        throw new Error(`Failed to update digger profile: ${updateError.message}`);
      }

      logStep("Subscription activated successfully", { digger_profile_id, subscriptionId });
    }

    // Handle subscription updated (tier changes, renewals)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;

      if (!metadata?.digger_profile_id) {
        logStep("No digger_profile_id in subscription metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Processing subscription update", {
        digger_profile_id: metadata.digger_profile_id,
        status: subscription.status,
      });

      // Update subscription status
      const updateData: any = {
        subscription_status: subscription.status,
        subscription_end_date: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      };

      // If subscription was canceled or past due, update accordingly
      if (subscription.status === 'canceled' || subscription.status === 'past_due') {
        updateData.subscription_tier = null;
      }

      const { error: updateError } = await supabaseClient
        .from('digger_profiles')
        .update(updateData)
        .eq('id', metadata.digger_profile_id);

      if (updateError) {
        logStep("Error updating subscription status", { error: updateError });
      } else {
        logStep("Subscription status updated", { digger_profile_id: metadata.digger_profile_id });
      }
    }

    // Handle subscription canceled
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;

      if (!metadata?.digger_profile_id) {
        logStep("No digger_profile_id in subscription metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Processing subscription cancellation", {
        digger_profile_id: metadata.digger_profile_id,
      });

      const { error: updateError } = await supabaseClient
        .from('digger_profiles')
        .update({
          subscription_status: 'canceled',
          subscription_tier: null,
          stripe_subscription_id: null,
        })
        .eq('id', metadata.digger_profile_id);

      if (updateError) {
        logStep("Error updating canceled subscription", { error: updateError });
      } else {
        logStep("Subscription canceled in database", { digger_profile_id: metadata.digger_profile_id });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
