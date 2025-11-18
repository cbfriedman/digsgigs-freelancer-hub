import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LEAD-PURCHASE] ${step}${detailsStr}`);
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

    const { diggerId, gigId, pricingModel } = await req.json();
    
    if (!diggerId || !gigId || !pricingModel) {
      throw new Error("Missing required fields: diggerId, gigId, or pricingModel");
    }

    logStep("Request data", { diggerId, gigId, pricingModel });

    // Get digger profile to determine subscription tier
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_tier, hourly_rate_min, hourly_rate_max, user_id')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    // Verify the authenticated user is the digger
    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized: You can only purchase leads for your own profile");
    }

    logStep("Digger profile found", { tier: diggerProfile.subscription_tier });

    // Get gig details to get consumer_id
    const { data: gig, error: gigError } = await supabaseClient
      .from('gigs')
      .select('consumer_id, title')
      .eq('id', gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    logStep("Gig found", { consumerId: gig.consumer_id });

    // Calculate lead cost based on tier
    const tier = (diggerProfile.subscription_tier || 'free') as 'free' | 'pro' | 'premium';
    let leadCost = 20; // Default free tier
    if (tier === 'premium') leadCost = 5;
    else if (tier === 'pro') leadCost = 10;

    // For free estimates with premium/pro tier, lead cost is 0
    if (pricingModel === 'free_estimate' && (tier === 'pro' || tier === 'premium')) {
      leadCost = 0;
    }

    // For free estimates with free tier, charge $20 as per pricing table
    if (pricingModel === 'free_estimate' && tier === 'free') {
      leadCost = 20;
    }

    logStep("Lead cost calculated", { leadCost, tier, pricingModel });

    // Create lead purchase record
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .insert({
        digger_id: diggerId,
        gig_id: gigId,
        consumer_id: gig.consumer_id,
        purchase_price: leadCost,
        amount_paid: leadCost,
        status: leadCost === 0 ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Error creating lead purchase", { error: purchaseError });
      throw new Error(`Failed to create lead purchase: ${purchaseError.message}`);
    }

    logStep("Lead purchase created", { leadPurchaseId: leadPurchase.id });

    // If lead cost is 0, return success immediately
    if (leadCost === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        leadPurchaseId: leadPurchase.id,
        message: "Lead access granted at no cost"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Lead Purchase - ${gig.title}`,
              description: `${pricingModel === 'fixed' ? 'Fixed Price' : pricingModel === 'hourly' ? 'Hourly Rate' : 'Free Estimate'} Lead`,
            },
            unit_amount: Math.round(leadCost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/gig/${gigId}?lead_purchased=true`,
      cancel_url: `${req.headers.get("origin")}/gig/${gigId}?lead_purchase_cancelled=true`,
      metadata: {
        lead_purchase_id: leadPurchase.id,
        digger_id: diggerId,
        gig_id: gigId,
        pricing_model: pricingModel,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      leadPurchaseId: leadPurchase.id
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
