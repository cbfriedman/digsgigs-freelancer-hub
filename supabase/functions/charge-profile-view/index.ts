import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-PROFILE-VIEW] ${step}${detailsStr}`);
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

    const { diggerId } = await req.json();
    
    if (!diggerId) {
      throw new Error("Missing required field: diggerId");
    }

    logStep("Request data", { diggerId });

    // Check if user has already viewed this profile
    const { data: existingView } = await supabaseClient
      .from('profile_views')
      .select('*')
      .eq('consumer_id', user.id)
      .eq('digger_id', diggerId)
      .single();

    if (existingView) {
      logStep("Profile already viewed, no charge");
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyPaid: true,
        message: "Contact info already unlocked"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get digger profile to determine costs based on tier
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_tier, business_name')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    logStep("Digger profile found", { tier: diggerProfile.subscription_tier });

    // Calculate total charge: view fee + lead cost based on tier
    const tier = (diggerProfile.subscription_tier || 'free') as 'free' | 'pro' | 'premium';
    let viewFee = 125; // Default free tier
    let leadCost = 20; // Default free tier
    
    if (tier === 'premium') {
      viewFee = 75;
      leadCost = 5;
    } else if (tier === 'pro') {
      viewFee = 100;
      leadCost = 10;
    }

    const totalCharge = viewFee + leadCost;

    logStep("Charge calculated", { viewFee, leadCost, totalCharge, tier });

    // If total charge is 0, just record the view
    if (totalCharge === 0) {
      const { error: viewError } = await supabaseClient
        .from('profile_views')
        .insert({
          consumer_id: user.id,
          digger_id: diggerId,
          amount_charged: 0,
        });

      if (viewError) {
        throw new Error(`Failed to record profile view: ${viewError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true,
        charged: false,
        message: "Contact info unlocked (no charge for Premium diggers)"
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
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId = customers.data.length > 0 ? customers.data[0].id : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `View Contact Info - ${diggerProfile.business_name}`,
              description: `Profile View Fee ($${viewFee}) + Lead Access Fee ($${leadCost})`,
            },
            unit_amount: totalCharge * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/digger-detail/${diggerId}?view=success`,
      cancel_url: `${req.headers.get("origin")}/digger-detail/${diggerId}?view=cancelled`,
      metadata: {
        type: "profile_view",
        consumer_id: user.id,
        digger_id: diggerId,
        view_fee: viewFee.toString(),
        lead_cost: leadCost.toString(),
        total_charge: totalCharge.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      totalCharge,
      viewFee,
      leadCost
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