import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyWebhookAndGetStripeContextAsync } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
    }
    const body = await req.text();
    const ctx = await verifyWebhookAndGetStripeContextAsync(body, signature, "STRIPE_WEBHOOK_SECRET");
    if (!ctx) {
      console.error("[stripe-webhook-lead-unlock] Signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }
    const { event } = ctx;
    const stripe = new Stripe(ctx.secretKey, { apiVersion: "2025-08-27.basil" });

    console.log(`[stripe-webhook-lead-unlock] Event type: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      // Only process lead_unlock type
      if (metadata?.type !== "lead_unlock") {
        console.log("[stripe-webhook-lead-unlock] Not a lead unlock session, skipping");
        return new Response(JSON.stringify({ received: true, skipped: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const leadId = metadata.leadId;
      const diggerId = metadata.diggerId;
      const userId = metadata.userId;
      const priceCents = parseInt(metadata.priceCents || "0");

      console.log(`[stripe-webhook-lead-unlock] Processing unlock - Lead: ${leadId}, Digger: ${diggerId}`);

      // Create the lead_unlock record
      const { error: unlockError } = await supabase
        .from("lead_unlocks")
        .insert({
          lead_id: leadId,
          digger_id: diggerId,
          user_id: userId,
          price_paid_cents: priceCents,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
          unlocked_at: new Date().toISOString(),
        });

      if (unlockError) {
        // Check if it's a duplicate (already unlocked)
        if (unlockError.code === "23505") {
          console.log("[stripe-webhook-lead-unlock] Lead already unlocked (duplicate)");
        } else {
          console.error("[stripe-webhook-lead-unlock] Error creating unlock:", unlockError);
          throw unlockError;
        }
      } else {
        console.log("[stripe-webhook-lead-unlock] Lead unlock created successfully");
      }

      // Create lead_purchase so GigDetail and can_access_gig show contact (same gig, digger, completed)
      const priceDollars = Math.round(priceCents) / 100;
      const { data: gigRow } = await supabase
        .from("gigs")
        .select("consumer_id")
        .eq("id", leadId)
        .single();
      if (gigRow?.consumer_id) {
        const { error: purchaseErr } = await supabase
          .from("lead_purchases")
          .insert({
            digger_id: diggerId,
            gig_id: leadId,
            consumer_id: gigRow.consumer_id,
            purchase_price: priceDollars,
            amount_paid: priceDollars,
            status: "completed",
            stripe_payment_id: session.payment_intent as string,
          });
        if (purchaseErr) {
          if (purchaseErr.code === "23505") {
            console.log("[stripe-webhook-lead-unlock] lead_purchase already exists (duplicate)");
          } else {
            console.error("[stripe-webhook-lead-unlock] Error creating lead_purchase:", purchaseErr);
          }
        } else {
          console.log("[stripe-webhook-lead-unlock] lead_purchase created for contact access");
        }
      }

      // Increment purchase count on the gig
      const { error: updateError } = await supabase
        .from("gigs")
        .update({ 
          purchase_count: supabase.rpc("increment_column", { row_id: leadId, column_name: "purchase_count" })
        })
        .eq("id", leadId);

      // Simpler increment approach
      const { data: gig } = await supabase
        .from("gigs")
        .select("purchase_count")
        .eq("id", leadId)
        .single();

      if (gig) {
        await supabase
          .from("gigs")
          .update({ purchase_count: (gig.purchase_count || 0) + 1 })
          .eq("id", leadId);
      }

      console.log("[stripe-webhook-lead-unlock] Lead unlock complete");
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[stripe-webhook-lead-unlock] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
