import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    logStep("Payment verified", { status: session.payment_status });

    const diggerId = session.metadata?.digger_id;
    const gigIds = session.metadata?.gig_ids?.split(",") || [];

    if (!diggerId || gigIds.length === 0) {
      throw new Error("Invalid session metadata");
    }

    // Fetch gig details
    const { data: gigs } = await supabaseClient
      .from("gigs")
      .select("id, consumer_id, budget_min, budget_max")
      .in("id", gigIds);

    if (!gigs) throw new Error("Failed to fetch gigs");

    // Create lead purchase records
    const purchases = gigs.map(gig => {
      const leadPrice = gig.budget_min ? Math.max(50, (gig.budget_min * 0.005)) : 50;
      
      return {
        digger_id: diggerId,
        gig_id: gig.id,
        consumer_id: gig.consumer_id,
        purchase_price: leadPrice,
        amount_paid: leadPrice,
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
