import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-BULK-PURCHASE] ${step}${detailsStr}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("No session ID provided");
    logStep("Session ID received", { sessionId });

    const { secretKey } = await getStripeConfig(supabaseClient);
    if (!secretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });

    // Retrieve session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    logStep("Payment verified", { status: session.payment_status });

    const diggerId = session.metadata?.digger_id;
    const gigIds = session.metadata?.gig_ids?.split(",")?.filter(Boolean) || [];

    if (!diggerId || gigIds.length === 0) {
      throw new Error("Invalid session metadata");
    }

    // Fetch line items with expanded product so we can read gig_id and amount per lead
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(sessionId, {
      expand: ["data.price.product"],
      limit: 100,
    });
    const lineItems = lineItemsResponse.data ?? [];

    const priceByGigId: Record<string, number> = {};
    for (const item of lineItems) {
      const amountCents = item.amount_total ?? (item.price && typeof item.price === "object" && "unit_amount" in item.price ? item.price.unit_amount : 0) ?? 0;
      const amountDollars = Math.round(Number(amountCents)) / 100;
      const price = item.price;
      const product = price && typeof price === "object" && price.product && typeof price.product === "object" ? price.product : null;
      const gigId = product?.metadata?.gig_id ?? null;
      if (gigId) {
        priceByGigId[gigId] = amountDollars;
      }
    }
    logStep("Prices from line items", { priceByGigId, lineItemCount: lineItems.length });

    // Fetch gig details
    const { data: gigs } = await supabaseClient
      .from("gigs")
      .select("id, consumer_id, budget_min, budget_max, calculated_price_cents")
      .in("id", gigIds);

    if (!gigs) throw new Error("Failed to fetch gigs");

    // Fallback price when line item has no product metadata: non-exclusive formula (3%, $20 min, $69 max)
    const getFallbackPriceDollars = (gig: { budget_min?: number | null; budget_max?: number | null; calculated_price_cents?: number | null }): number => {
      if (gig.calculated_price_cents != null && gig.calculated_price_cents > 0) {
        const dollars = Math.round(gig.calculated_price_cents / 100);
        return Math.min(69, Math.max(20, dollars));
      }
      const min = gig.budget_min ?? 0;
      const max = gig.budget_max ?? min;
      const avg = (min + max) / 2;
      if (avg <= 0) return 20;
      const fromRate = Math.round(avg * 0.03);
      const priceDollars = Math.min(69, Math.max(20, fromRate));
      return priceDollars;
    };

    // Create lead purchase records with actual amount paid per lead from Stripe
    const purchases = gigs.map(gig => {
      const amountPaid = priceByGigId[gig.id] ?? getFallbackPriceDollars(gig);

      return {
        digger_id: diggerId,
        gig_id: gig.id,
        consumer_id: gig.consumer_id,
        purchase_price: amountPaid,
        amount_paid: amountPaid,
        status: "completed",
        stripe_payment_id: session.payment_intent as string,
      };
    });

    const { data: createdPurchases, error: purchaseError } = await supabaseClient
      .from("lead_purchases")
      .insert(purchases)
      .select();

    if (purchaseError) {
      logStep("ERROR creating purchases", { error: purchaseError });
      throw new Error("Failed to create lead purchases");
    }

    logStep("Lead purchases created", { count: createdPurchases.length });

    return new Response(JSON.stringify({ 
      success: true, 
      purchaseCount: createdPurchases.length 
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
