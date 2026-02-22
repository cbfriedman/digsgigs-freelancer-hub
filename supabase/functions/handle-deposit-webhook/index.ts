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

      // Milestone payment via Checkout (no saved payment method)
      if (session.metadata?.type === "milestone_payment") {
        const milestonePaymentId = session.metadata.milestone_payment_id;
        const escrowContractId = session.metadata.escrow_contract_id;
        const consumerId = session.metadata.consumer_id;
        const diggerId = session.metadata.digger_id;
        const gigId = session.metadata.gig_id;

        if (!milestonePaymentId || !escrowContractId || !diggerId || !gigId) {
          logStep("Milestone payment metadata incomplete", session.metadata);
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        logStep("Processing milestone payment from Checkout", { milestonePaymentId, gigId });

        const { data: milestone } = await supabaseClient
          .from("milestone_payments")
          .select("id, milestone_number, amount, digger_payout, status, stripe_payment_intent_id")
          .eq("id", milestonePaymentId)
          .single();

        if (!milestone || milestone.status === "paid" || milestone.stripe_payment_intent_id) {
          logStep("Milestone already paid or not found", { milestonePaymentId });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const paymentIntentId = session.payment_intent as string;
        // Destination charge: Stripe already sent funds to digger's Connect account via payment_intent_data.transfer_data
        await supabaseClient
          .from("milestone_payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            released_at: new Date().toISOString(),
          })
          .eq("id", milestonePaymentId);

        logStep("Milestone marked paid (destination charge - digger received funds at charge time)");

        let bidId = (await supabaseClient.from("gigs").select("awarded_bid_id").eq("id", gigId).single()).data?.awarded_bid_id;
        if (!bidId) {
          const bidRow = await supabaseClient
            .from("bids")
            .select("id")
            .eq("gig_id", gigId)
            .eq("digger_id", diggerId)
            .eq("status", "accepted")
            .limit(1)
            .maybeSingle();
          bidId = bidRow.data?.id ?? null;
        }

        let diggerPayout = Number(milestone.digger_payout);
        if (milestone.milestone_number === 1 && bidId) {
          const { data: bidRow } = await supabaseClient.from("bids").select("amount").eq("id", bidId).single();
          const { data: depositRow } = await supabaseClient.from("gigger_deposits").select("id").eq("bid_id", bidId).eq("status", "paid").maybeSingle();
          if (bidRow?.amount != null && depositRow) {
            diggerPayout += Math.round(Number(bidRow.amount) * 0.07 * 100) / 100;
          }
        }

        const amountCents = Math.round(Number(milestone.amount) * 100);
        const transactionFeeCents = Math.round(amountCents * 0.03);
        await supabaseClient.from("transactions").insert({
          gig_id: gigId,
          bid_id: bidId ?? null,
          consumer_id: consumerId,
          digger_id: diggerId,
          total_amount: (amountCents + transactionFeeCents) / 100,
          commission_rate: 0.03,
          commission_amount: transactionFeeCents / 100,
          digger_payout: diggerPayout,
          status: "completed",
          completed_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          escrow_contract_id: escrowContractId,
          milestone_payment_id: milestonePaymentId,
          is_escrow: false,
        });

        logStep("Milestone payment completed via Checkout webhook");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if this is a gigger deposit payment
      if (session.metadata?.type !== "gigger_deposit") {
        logStep("Not a gigger deposit or milestone payment, skipping");
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

      // Award: set gig status "awarded"; Digger must accept within 24h or face $100 penalty (decline = $100 too)
      const awardedAt = new Date().toISOString();

      await supabaseClient
        .from("bids")
        .update({
          awarded: true,
          awarded_at: awardedAt,
          award_method: "consumer_hire",
          status: "pending",
        })
        .eq("id", bidId);

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
        .select("acceptance_deadline, base_rate_amount_cents, lead_cost_amount_cents, deposit_amount_cents")
        .eq("id", depositId)
        .single();

      if (diggerProfile) {
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: diggerProfile.user_id,
            type: "lead_awarded_exclusive",
            title: "You're awarded",
            message: `You've been awarded "${gig?.title || 'this gig'}". Accept within 24 hours or you'll be charged a $100 penalty. If you decline, you'll be charged a $100 penalty and the client gets their deposit back.`,
            link: `/gig/${gigId}`,
            metadata: {
              gig_id: gigId,
              bid_id: bidId,
              deposit_id: depositId,
              acceptance_deadline: deposit?.acceptance_deadline,
            },
          });

        logStep("Notification sent to digger", { userId: diggerProfile.user_id });
      }

      logStep("Lead award completed via deposit webhook (Digger must accept within 24h)");
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
