import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "https://digsandgigs.net",
  "https://www.digsandgigs.net",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GEO-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// Subscription tier pricing configuration
const SUBSCRIPTION_TIERS: Record<string, { monthly: string; annual: string; monthlyPriceCents: number; annualPriceCents: number }> = {
  local_lv_mv: {
    monthly: 'price_1ShJOkRuFpm7XGfuldUtDYCW',
    annual: 'price_1ShJOyRuFpm7XGfuBzBRR8jh',
    monthlyPriceCents: 1900,
    annualPriceCents: 19000,
  },
  local_hv: {
    monthly: 'price_1ShJPxRuFpm7XGfuFsl8EDpz',
    annual: 'price_1ShJQrRuFpm7XGfuzHnllY63',
    monthlyPriceCents: 3900,
    annualPriceCents: 39000,
  },
  statewide_lv_mv: {
    monthly: 'price_1ShJR4RuFpm7XGfuDnd5zQBW',
    annual: 'price_1ShJRFRuFpm7XGfuH23MrcKN',
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
  },
  statewide_hv: {
    monthly: 'price_1ShJRTRuFpm7XGfuOeU7QREH',
    annual: 'price_1ShJRhRuFpm7XGfupcbZV55Z',
    monthlyPriceCents: 9900,
    annualPriceCents: 99000,
  },
  nationwide_lv_mv: {
    monthly: 'price_1ShJRuRuFpm7XGfuD6GZfhv2',
    annual: 'price_1ShJT2RuFpm7XGfueqAqc2DP',
    monthlyPriceCents: 9900,
    annualPriceCents: 99000,
  },
  nationwide_hv: {
    monthly: 'price_1ShJTnRuFpm7XGfuMQPfNwDk',
    annual: 'price_1ShJU2RuFpm7XGfu9oO3NF4Y',
    monthlyPriceCents: 19900,
    annualPriceCents: 199000,
  },
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { 
      digger_profile_id,
      geographic_tier,
      industry_type,
      billing_cycle = 'monthly'
    } = await req.json();

    logStep("Request params", { digger_profile_id, geographic_tier, industry_type, billing_cycle });

    if (!digger_profile_id || !geographic_tier || !industry_type) {
      throw new Error("Missing required parameters: digger_profile_id, geographic_tier, industry_type");
    }

    // Validate tier exists
    const tierKey = `${geographic_tier}_${industry_type}`;
    const tier = SUBSCRIPTION_TIERS[tierKey];
    if (!tier) {
      throw new Error(`Invalid tier combination: ${tierKey}`);
    }

    // Get the correct price ID based on billing cycle
    const priceId = billing_cycle === 'annual' ? tier.annual : tier.monthly;
    const priceCents = billing_cycle === 'annual' ? tier.annualPriceCents : tier.monthlyPriceCents;
    logStep("Selected price", { priceId, priceCents, billing_cycle });

    // Verify the digger profile belongs to this user
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('id, user_id, business_name')
      .eq('id', digger_profile_id)
      .eq('user_id', user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found or doesn't belong to user");
    }
    logStep("Digger profile verified", { profileId: diggerProfile.id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Create Stripe checkout session
    const checkoutOrigin = origin || "https://digsandgigs.com";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${checkoutOrigin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutOrigin}/subscription?canceled=true`,
      metadata: {
        digger_profile_id,
        geographic_tier,
        industry_type,
        billing_cycle,
        original_price_cents: priceCents.toString(),
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          digger_profile_id,
          geographic_tier,
          industry_type,
          billing_cycle,
          original_price_cents: priceCents.toString(),
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
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
