/**
 * Process single lead unlock after Stripe checkout — same pattern as process-bulk-purchase.
 * Called by GigDetail when user returns with ?lead_purchased=true&session_id=...
 * Creates lead_unlock + lead_purchase so contact shows on the gig page (no webhook dependency).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PROCESS-LEAD-UNLOCK] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const metadata = session.metadata || {};
    if (metadata.type !== "lead_unlock") {
      throw new Error("Not a lead unlock session");
    }

    const leadId = metadata.leadId as string;
    const diggerId = metadata.diggerId as string;
    const userId = metadata.userId as string;
    const priceCents = parseInt(String(metadata.priceCents || "0"), 10);
    if (!leadId || !diggerId) throw new Error("Invalid session metadata");

    logStep("Processing unlock", { leadId, diggerId });

    const priceDollars = Math.round(priceCents) / 100;

    const { error: unlockError } = await supabaseClient.from("lead_unlocks").insert({
      lead_id: leadId,
      digger_id: diggerId,
      user_id: userId,
      price_paid_cents: priceCents,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_checkout_session_id: session.id,
      unlocked_at: new Date().toISOString(),
    });

    if (unlockError) {
      if (unlockError.code === "23505") {
        logStep("Lead unlock already exists (duplicate)");
      } else {
        logStep("Error creating lead_unlock", unlockError);
        throw unlockError;
      }
    } else {
      logStep("Lead unlock created");
    }

    const { data: gigRow } = await supabaseClient
      .from("gigs")
      .select("consumer_id, purchase_count")
      .eq("id", leadId)
      .single();

    if (gigRow?.consumer_id) {
      const { error: purchaseErr } = await supabaseClient.from("lead_purchases").insert({
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
          logStep("lead_purchase already exists");
        } else {
          logStep("Error creating lead_purchase", purchaseErr);
          throw purchaseErr;
        }
      } else {
        logStep("lead_purchase created");
      }
    }

    if (gigRow) {
      await supabaseClient
        .from("gigs")
        .update({ purchase_count: (gigRow.purchase_count || 0) + 1 })
        .eq("id", leadId);
    }

    return new Response(
      JSON.stringify({ success: true, diggerId, gigId: leadId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("ERROR", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
