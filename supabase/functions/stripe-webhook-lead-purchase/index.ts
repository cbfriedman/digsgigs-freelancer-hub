import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// NOTE: Webhooks must allow all origins because Stripe sends from their own origin
// This is safe because webhook signature verification ensures authenticity
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-LEAD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      const metadata = session.metadata;
      if (!metadata?.lead_purchase_id) {
        logStep("No lead_purchase_id in metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const leadPurchaseId = metadata.lead_purchase_id;
      const diggerId = metadata.digger_id;
      const gigId = metadata.gig_id;
      const pricingModel = metadata.pricing_model;

      logStep("Lead purchase metadata extracted", { leadPurchaseId, diggerId, gigId, pricingModel });

      // SECURITY: Get lead purchase record and verify payment amount matches expected price
      const { data: leadPurchase, error: purchaseFetchError } = await supabaseClient
        .from('lead_purchases')
        .select('purchase_price, amount_paid, status')
        .eq('id', leadPurchaseId)
        .single();

      if (purchaseFetchError || !leadPurchase) {
        logStep("Error fetching lead purchase for verification", { error: purchaseFetchError });
        throw new Error("Lead purchase record not found");
      }

      // Verify payment amount matches expected price (allow 1 cent tolerance for rounding)
      const paymentAmount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents
      const expectedPrice = leadPurchase.purchase_price || 0;
      const priceDifference = Math.abs(paymentAmount - expectedPrice);

      if (priceDifference > 0.01) {
        logStep("CRITICAL: Price mismatch detected", { 
          expected: expectedPrice, 
          received: paymentAmount,
          difference: priceDifference,
          sessionId: session.id
        });
        throw new Error(`Payment amount mismatch: expected $${expectedPrice}, received $${paymentAmount}`);
      }

      logStep("Price verification passed", { expected: expectedPrice, received: paymentAmount });

      // Update lead purchase status to completed
      const { error: updateError } = await supabaseClient
        .from('lead_purchases')
        .update({
          status: 'completed',
          stripe_payment_id: session.payment_intent as string,
          amount_paid: paymentAmount, // Store actual amount paid
        })
        .eq('id', leadPurchaseId);

      if (updateError) {
        logStep("Error updating lead purchase", { error: updateError });
        throw updateError;
      }

      logStep("Lead purchase marked as completed");

      // Increment monthly lead count for the digger
      const { data: currentDigger } = await supabaseClient
        .from('digger_profiles')
        .select('monthly_lead_count')
        .eq('id', diggerId)
        .single();

      const newLeadCount = (currentDigger?.monthly_lead_count || 0) + 1;

      const { error: incrementError } = await supabaseClient
        .from('digger_profiles')
        .update({ monthly_lead_count: newLeadCount })
        .eq('id', diggerId);

      if (incrementError) {
        logStep("Error incrementing lead count", { error: incrementError });
      } else {
        logStep("Monthly lead count incremented", { newCount: newLeadCount });
      }

      // Get digger and gig details for notifications
      const { data: diggerProfile, error: diggerError } = await supabaseClient
        .from('digger_profiles')
        .select('business_name, user_id')
        .eq('id', diggerId)
        .single();

      const { data: gig, error: gigError } = await supabaseClient
        .from('gigs')
        .select('title, consumer_id')
        .eq('id', gigId)
        .single();

      if (diggerError || gigError || !diggerProfile || !gig) {
        logStep("Error fetching details for notifications", { diggerError, gigError });
        // Continue even if notifications fail
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const pricingModelText = pricingModel === 'fixed' ? 'Fixed Price Proposal' 
        : pricingModel === 'hourly' ? 'Hourly Rate Quote' 
        : 'Free Estimate';

      // Create notification for digger
      const { error: diggerNotifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: diggerProfile.user_id,
          type: 'lead_purchase',
          title: 'New Lead Purchase',
          message: `You have successfully purchased access to "${gig.title}". The client is now able to see your contact information.`,
          link: `/gig/${gigId}`,
          metadata: {
            lead_purchase_id: leadPurchaseId,
            gig_id: gigId,
            pricing_model: pricingModel,
          },
        });

      if (diggerNotifError) {
        logStep("Error creating digger notification", { error: diggerNotifError });
      } else {
        logStep("Digger notification created");
      }

      // Create notification for gigger (consumer)
      const { error: giggerNotifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: gig.consumer_id,
          type: 'lead_purchase',
          title: 'Professional Interested in Your Gig',
          message: `${diggerProfile.business_name} has requested a ${pricingModelText} for "${gig.title}". They can now contact you.`,
          link: `/my-gigs`,
          metadata: {
            lead_purchase_id: leadPurchaseId,
            gig_id: gigId,
            digger_id: diggerId,
            pricing_model: pricingModel,
          },
        });

      if (giggerNotifError) {
        logStep("Error creating gigger notification", { error: giggerNotifError });
      } else {
        logStep("Gigger notification created");
      }

      logStep("Webhook processing completed successfully");
    } else {
      logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
