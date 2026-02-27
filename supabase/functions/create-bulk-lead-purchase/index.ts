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

    // Parse request body to get purchases with exclusivity types
    const { purchases } = await req.json();
    if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
      throw new Error("No purchases provided");
    }
    
    const gigIds = purchases.map((p: any) => p.gigId);
    logStep("Processing gigs", { count: gigIds.length, purchases });

    // Fetch gig details (include calculated_price_cents for canonical lead price)
    const { data: gigs, error: gigsError } = await supabaseClient
      .from("gigs")
      .select("id, title, description, budget_min, budget_max, consumer_id, calculated_price_cents")
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

    // Lead price (non-exclusive): max(round(budget avg × 3%), $20), $69 max (must match frontend @/lib/leadPrice and cart)
    const getLeadPriceCents = (gig: { budget_min?: number | null; budget_max?: number | null; calculated_price_cents?: number | null }): number => {
      if (gig.calculated_price_cents != null && gig.calculated_price_cents > 0) {
        const dollars = Math.round(gig.calculated_price_cents / 100);
        const clamped = Math.min(69, Math.max(20, dollars));
        return clamped * 100;
      }
      const min = gig.budget_min ?? 0;
      const max = gig.budget_max ?? min;
      const avg = (min + max) / 2;
      if (avg <= 0) return 2000; // $20 default
      const fromRate = Math.round(avg * 0.03);
      const priceDollars = Math.min(69, Math.max(20, fromRate));
      return priceDollars * 100;
    };

    // Calculate prices for each lead (non-exclusive: 3%, $20 min, $69 max)
    const lineItems = purchases.map((purchase: any) => {
      const gig = gigs.find(g => g.id === purchase.gigId);
      if (!gig) throw new Error(`Gig not found: ${purchase.gigId}`);
      
      const priceInCents = getLeadPriceCents(gig);
      const leadCost = priceInCents / 100;
      
      const exclusivityLabel = purchase.exclusivityType === 'semi-exclusive' 
        ? 'Semi-Exclusive (4 max)' 
        : purchase.exclusivityType === 'exclusive'
        ? '24hr Exclusive'
        : 'Non-Exclusive';

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${exclusivityLabel} Lead: ${gig.title}`,
            description: `Contact information for gig opportunity`,
            metadata: {
              gig_id: gig.id,
              digger_id: diggerProfile.id,
              consumer_id: gig.consumer_id,
              lead_price: leadCost.toString(),
              exclusivity_type: purchase.exclusivityType,
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
