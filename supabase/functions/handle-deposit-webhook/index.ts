import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEPOSIT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    logStep("Webhook received", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a gigger deposit payment
      if (session.metadata?.type !== "gigger_deposit") {
        logStep("Not a gigger deposit payment, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const depositId = session.metadata.deposit_id;
      const gigId = session.metadata.gig_id;
      const bidId = session.metadata.bid_id;
      const giggerId = session.metadata.gigger_id;
      const diggerId = session.metadata.digger_id;

      logStep("Processing gigger deposit payment", { depositId, gigId, bidId });

      // Update deposit status to paid
      const { error: updateError } = await supabaseClient
        .from("gigger_deposits")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", depositId);

      if (updateError) {
        logStep("Failed to update deposit", { error: updateError.message });
        throw new Error(`Failed to update deposit: ${updateError.message}`);
      }

      logStep("Deposit marked as paid", { depositId });

      // Now actually award the lead
      const awardedAt = new Date().toISOString();

      // Update bid as awarded
      await supabaseClient
        .from("bids")
        .update({
          awarded: true,
          awarded_at: awardedAt,
          award_method: "consumer_hire",
        })
        .eq("id", bidId);

      // Update gig status
      await supabaseClient
        .from("gigs")
        .update({
          awarded_at: awardedAt,
          awarded_digger_id: diggerId,
          awarded_bid_id: bidId,
          status: "awarded",
        })
        .eq("id", gigId);

      // Get digger profile for notification
      const { data: diggerProfile } = await supabaseClient
        .from("digger_profiles")
        .select("user_id, business_name")
        .eq("id", diggerId)
        .single();

      // Get gig details
      const { data: gig } = await supabaseClient
        .from("gigs")
        .select("title")
        .eq("id", gigId)
        .single();

      // Get deposit details for notification
      const { data: deposit } = await supabaseClient
        .from("gigger_deposits")
        .select("acceptance_deadline, base_rate_amount_cents")
        .eq("id", depositId)
        .single();

      if (diggerProfile) {
        // Notify the awarded digger with 24-hour deadline
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: diggerProfile.user_id,
            type: "lead_awarded_exclusive",
            title: "🎉 Exclusive Job Award!",
            message: `You've been exclusively awarded "${gig?.title || 'a project'}". Accept within 24 hours to receive the $${((deposit?.base_rate_amount_cents || 0) / 100).toFixed(0)} down-payment as an advance!`,
            link: `/gig/${gigId}`,
            metadata: {
              gig_id: gigId,
              bid_id: bidId,
              deposit_id: depositId,
              acceptance_deadline: deposit?.acceptance_deadline,
              deposit_bonus_cents: deposit?.base_rate_amount_cents,
            },
          });

        logStep("Notification sent to digger", { userId: diggerProfile.user_id });
      }

      logStep("Lead award completed via deposit webhook");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
