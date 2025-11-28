import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BULK-LEAD-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { selections, totalAmount, diggerProfileId } = await req.json();
    
    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      throw new Error("No lead selections provided");
    }
    
    if (!diggerProfileId) {
      throw new Error("Digger profile ID is required");
    }

    logStep("Lead selections received", { count: selections.length, totalAmount, diggerProfileId });

    // Initialize Stripe for payment
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Create line items for each lead selection
    const lineItems = selections.map((selection: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${selection.keyword} Lead`,
          description: `${selection.exclusivity === 'non-exclusive' ? 'Non-Exclusive' : selection.exclusivity === 'semi-exclusive' ? 'Semi-Exclusive (4 max)' : '24hr Exclusive'} - ${selection.quantity} lead${selection.quantity !== 1 ? 's' : ''}`,
        },
        unit_amount: Math.round((totalAmount / selections.reduce((sum: number, s: any) => sum + s.quantity, 0)) * 100), // Average price per lead in cents
      },
      quantity: selection.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/checkout-success?type=lead_credits`,
      cancel_url: `${req.headers.get("origin")}/keyword-summary?profileId=${diggerProfileId}&cancelled=true`,
      metadata: {
        user_id: user.id,
        digger_profile_id: diggerProfileId,
        purchase_type: "keyword_bulk",
        lead_selections: JSON.stringify(selections),
        total_amount: totalAmount.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
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
