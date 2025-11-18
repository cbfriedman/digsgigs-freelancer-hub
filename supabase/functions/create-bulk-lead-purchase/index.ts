import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BULK-LEAD-PURCHASE] ${step}${detailsStr}`);
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
    logStep("User authenticated", { userId: user.id });

    // Get digger profile with hourly rate and subscription tier
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, hourly_rate_min, hourly_rate_max, subscription_tier, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }
    
    // Calculate average hourly rate
    const hourlyMin = diggerProfile.hourly_rate_min || 0;
    const hourlyMax = diggerProfile.hourly_rate_max || 0;
    const averageRate = (hourlyMin + hourlyMax) / 2;
    
    logStep("Digger profile found", { 
      diggerId: diggerProfile.id,
      hourlyMin,
      hourlyMax,
      averageRate
    });

    // Parse request body to get gig IDs
    const { gigIds } = await req.json();
    if (!gigIds || !Array.isArray(gigIds) || gigIds.length === 0) {
      throw new Error("No gig IDs provided");
    }
    logStep("Processing gigs", { count: gigIds.length, gigIds });

    // Fetch gig details and calculate prices
    const { data: gigs, error: gigsError } = await supabaseClient
      .from("gigs")
      .select("id, title, budget_min, budget_max, consumer_id")
      .in("id", gigIds);

    if (gigsError || !gigs || gigs.length === 0) {
      throw new Error("Failed to fetch gig details");
    }
    logStep("Gigs fetched", { count: gigs.length });

    // Check for existing purchases
    const { data: existingPurchases } = await supabaseClient
      .from("lead_purchases")
      .select("gig_id")
      .eq("digger_id", diggerProfile.id)
      .in("gig_id", gigIds);

    const alreadyPurchasedIds = existingPurchases?.map(p => p.gig_id) || [];
    if (alreadyPurchasedIds.length > 0) {
      throw new Error(`You have already purchased leads for some of these gigs: ${alreadyPurchasedIds.join(", ")}`);
    }

    // Check subscription tier - Pro and Premium get unlimited access without payment
    const isPremiumTier = diggerProfile.subscription_tier === 'pro' || 
                          diggerProfile.subscription_tier === 'premium';
    const hasActiveSubscription = diggerProfile.subscription_status === 'active';
    
    if (isPremiumTier && hasActiveSubscription) {
      logStep("Premium tier detected - granting free access", { 
        tier: diggerProfile.subscription_tier 
      });

      // Create lead purchases directly without payment
      const leadPurchases = gigs.map(gig => ({
        digger_id: diggerProfile.id,
        gig_id: gig.id,
        consumer_id: gig.consumer_id,
        purchase_price: 0,
        amount_paid: 0,
        status: 'completed',
        stripe_payment_id: null,
      }));

      const { error: insertError } = await supabaseClient
        .from("lead_purchases")
        .insert(leadPurchases);

      if (insertError) {
        logStep("Error creating lead purchases", { error: insertError });
        throw new Error("Failed to grant lead access");
      }

      logStep("Lead purchases created successfully", { count: leadPurchases.length });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Leads granted successfully",
          count: leadPurchases.length
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Free tier - proceed with Stripe payment
    logStep("Free tier - proceeding with Stripe checkout");
    
    // Get tier-based pricing
    const tier = diggerProfile.subscription_tier || 'free';
    let leadCost = 60; // Default: free tier
    if (tier === 'premium') {
      leadCost = 0;
    } else if (tier === 'pro') {
      leadCost = 40;
    }
    
    logStep("Tier-based pricing calculated", { tier, leadCost });

    // Calculate prices for each lead using tier-based pricing
    const lineItems = gigs.map(gig => {
      const priceInCents = Math.round(leadCost * 100);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Lead: ${gig.title}`,
            description: `Contact information for gig opportunity (${tier} tier)`,
            metadata: {
              gig_id: gig.id,
              digger_id: diggerProfile.id,
              consumer_id: gig.consumer_id,
              lead_price: leadCost.toString(),
            }
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      };
    });

    logStep("Line items created", { itemCount: lineItems.length });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create in checkout");
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/my-leads?bulk_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/browse-gigs?bulk_purchase=cancelled`,
      metadata: {
        digger_id: diggerProfile.id,
        user_id: user.id,
        gig_ids: gigIds.join(","),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
