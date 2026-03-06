import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { gigId, diggerId } = await req.json();
    
    if (!gigId || !diggerId) {
      throw new Error("Gig ID and Digger ID are required");
    }

    // Get digger details and verify they offer free estimates
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from("digger_profiles")
      .select("id, user_id, handle, offers_free_estimates, subscription_tier")
      .eq("id", diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger not found");
    }

    if (!diggerProfile.offers_free_estimates) {
      throw new Error("This digger does not offer free estimates");
    }

    // Determine price based on subscription tier
    const tierPricing = {
      free: 15000, // $150 in cents
      pro: 10000,  // $100 in cents
      premium: 5000 // $50 in cents
    };
    
    const subscriptionTier = diggerProfile.subscription_tier || 'free';
    const priceInCents = tierPricing[subscriptionTier as keyof typeof tierPricing] || tierPricing.free;
    const priceInDollars = priceInCents / 100;

    // Get digger user email for Stripe customer
    const { data: diggerUser, error: diggerUserError } = await supabaseClient.auth.admin.getUserById(
      diggerProfile.user_id
    );

    if (diggerUserError || !diggerUser.user?.email) {
      throw new Error("Could not find digger email");
    }

    // Get gig details
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("id, title, consumer_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    // Verify requesting user is the consumer (gig owner)
    if (gig.consumer_id !== user.id) {
      throw new Error("Only the gig owner can request free estimates");
    }

    // Check if digger already purchased this lead
    const { data: existingPurchase } = await supabaseClient
      .from("lead_purchases")
      .select("id")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .maybeSingle();

    if (existingPurchase) {
      throw new Error("This digger has already been contacted for this gig");
    }

    const { secretKey } = await getStripeConfig(supabaseClient);
    if (!secretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer for the DIGGER (who pays)
    const customers = await stripe.customers.list({ email: diggerUser.user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session with tier-based pricing
    // This will be sent to the digger to pay
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : diggerUser.user.email,
      payment_method_types: ["card", "us_bank_account", "paypal", "cashapp", "link"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceInCents,
            product_data: {
              name: "Free Estimate Lead",
              description: `Lead for gig: ${gig.title} (${subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)} tier)`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        gigId: gigId,
        diggerId: diggerId,
        amount: priceInDollars.toString(),
        type: "free_estimate",
        consumer_id: user.id,
        subscription_tier: subscriptionTier,
      },
      success_url: `${req.headers.get("origin")}/gig/${gigId}?estimate=sent`,
      cancel_url: `${req.headers.get("origin")}/gig/${gigId}?estimate=cancelled`,
    });

    return new Response(
      JSON.stringify({ 
        checkoutUrl: session.url,
        amount: priceInDollars,
        diggerEmail: diggerUser.user.email,
        subscriptionTier: subscriptionTier
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-free-estimate-checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});