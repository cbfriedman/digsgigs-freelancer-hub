import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event: Stripe.Event;
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error("[stripe-webhook-lead-unlock] Signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      console.warn("[stripe-webhook-lead-unlock] No webhook secret, processing unverified");
    }

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
