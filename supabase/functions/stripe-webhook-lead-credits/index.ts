import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyWebhookAndGetStripeContextAsync } from "../_shared/stripe.ts";

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
    const stripe = new Stripe(ctx.secretKey, { apiVersion: "2023-10-16" });
    logStep("Webhook signature verified", { type: event.type });

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
    const pendingPurchaseId = metadata.pending_purchase_id;

    // Current flow uses pending_purchase_id (handled by main stripe-webhook); skip here
    if (pendingPurchaseId) {
      logStep("Using pending_purchase_id flow - handled by main stripe-webhook, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!userId || !diggerProfileId || !leadSelectionsJson) {
      logStep("Missing required metadata (legacy flow), skipping", { userId: !!userId, diggerProfileId: !!diggerProfileId, leadSelectionsJson: !!leadSelectionsJson });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const originalAmount = parseFloat(metadata.original_amount || "0");
    const discountAmount = parseFloat(metadata.discount_amount || "0");
    const finalAmount = parseFloat(metadata.final_amount || "0");

    const leadSelections = JSON.parse(leadSelectionsJson);
    logStep("Parsed lead selections", { count: leadSelections.length, originalAmount, discountAmount, finalAmount });

    // Validate all selections are non-exclusive
    const nonExclusiveOnly = leadSelections.every((s: any) => s.exclusivity === 'non-exclusive');
    if (!nonExclusiveOnly) {
      logStep("ERROR: Non non-exclusive leads detected in bulk purchase", { leadSelections });
      throw new Error("Lead credits can only be purchased for non-exclusive leads");
    }

    // Initialize Supabase with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate discounted price per lead
    const totalQuantity = leadSelections.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const discountedPricePerLead = finalAmount / totalQuantity;

    // Create lead credits for each selection with discounted pricing
    const leadCredits = leadSelections.map((selection: any) => {
      return {
        user_id: userId,
        digger_profile_id: diggerProfileId,
        keyword: selection.keyword,
        industry: selection.industry,
        exclusivity_type: 'non-exclusive', // Always non-exclusive for credits
        quantity_purchased: selection.quantity,
        quantity_remaining: selection.quantity,
        price_per_lead: discountedPricePerLead, // Discounted price
        total_paid: discountedPricePerLead * selection.quantity,
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
