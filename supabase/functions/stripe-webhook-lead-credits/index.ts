import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-LEAD-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err?.message || String(err) });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err?.message || String(err)}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only handle checkout.session.completed events
    if (event.type !== "checkout.session.completed") {
      logStep("Ignoring non-checkout event", { type: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata || metadata.purchase_type !== "keyword_bulk") {
      logStep("Not a keyword bulk purchase, ignoring", { metadata });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Processing keyword bulk purchase", { sessionId: session.id });

    const userId = metadata.user_id;
    const diggerProfileId = metadata.digger_profile_id;
    const leadSelectionsJson = metadata.lead_selections;
    const totalAmount = parseFloat(metadata.total_amount);

    if (!userId || !diggerProfileId || !leadSelectionsJson) {
      throw new Error("Missing required metadata");
    }

    const leadSelections = JSON.parse(leadSelectionsJson);
    logStep("Parsed lead selections", { count: leadSelections.length });

    // Initialize Supabase with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create lead credits for each selection
    const leadCredits = leadSelections.map((selection: any) => {
      const pricePerLead = selection.subtotal / selection.quantity;
      return {
        user_id: userId,
        digger_profile_id: diggerProfileId,
        keyword: selection.keyword,
        industry: selection.industry,
        exclusivity_type: selection.exclusivity,
        quantity_purchased: selection.quantity,
        quantity_remaining: selection.quantity,
        price_per_lead: pricePerLead,
        total_paid: selection.subtotal,
        stripe_payment_id: session.payment_intent,
        stripe_session_id: session.id,
      };
    });

    const { data: insertedCredits, error: insertError } = await supabaseAdmin
      .from("lead_credits")
      .insert(leadCredits)
      .select();

    if (insertError) {
      logStep("Error inserting lead credits", { error: insertError });
      throw insertError;
    }

    logStep("Successfully created lead credits", { count: insertedCredits?.length });

    return new Response(JSON.stringify({ 
      success: true,
      credits_created: insertedCredits?.length 
    }), {
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
