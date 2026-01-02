import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-GEO-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Current pricing configuration
const CURRENT_PRICING: Record<string, { monthly: number; annual: number }> = {
  local_lv_mv: { monthly: 1900, annual: 19000 },
  local_hv: { monthly: 3900, annual: 39000 },
  statewide_lv_mv: { monthly: 4900, annual: 49000 },
  statewide_hv: { monthly: 9900, annual: 99000 },
  nationwide_lv_mv: { monthly: 9900, annual: 99000 },
  nationwide_hv: { monthly: 19900, annual: 199000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { digger_profile_id } = await req.json();

    if (!digger_profile_id) {
      throw new Error("Missing required parameter: digger_profile_id");
    }

    // Get digger profile
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select(`
        id,
        user_id,
        geographic_tier,
        industry_type,
        billing_cycle,
        subscription_status,
        subscription_tier,
        subscription_start_date,
        subscription_end_date,
        original_price_cents,
        price_locked,
        stripe_subscription_id,
        stripe_customer_id
      `)
      .eq('id', digger_profile_id)
      .eq('user_id', user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found or doesn't belong to user");
    }

    logStep("Digger profile fetched", { 
      profileId: diggerProfile.id,
      subscriptionStatus: diggerProfile.subscription_status,
    });

    // If there's a Stripe subscription, verify it's still active
    let stripeSubscriptionActive = false;
    let stripeSubscriptionEndDate: string | null = null;

    if (diggerProfile.stripe_subscription_id) {
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          const subscription = await stripe.subscriptions.retrieve(diggerProfile.stripe_subscription_id);
          
          stripeSubscriptionActive = subscription.status === 'active';
          stripeSubscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          logStep("Stripe subscription verified", { 
            status: subscription.status,
            endDate: stripeSubscriptionEndDate,
          });

          // Update local status if different
          if (diggerProfile.subscription_status !== subscription.status) {
            await supabaseClient
              .from('digger_profiles')
              .update({
                subscription_status: subscription.status,
                subscription_end_date: stripeSubscriptionEndDate,
              })
              .eq('id', digger_profile_id);
          }
        }
      } catch (stripeError) {
        logStep("Error verifying Stripe subscription", { error: stripeError });
      }
    }

    // Calculate price lock status
    const now = new Date();
    const subscriptionStartDate = diggerProfile.subscription_start_date 
      ? new Date(diggerProfile.subscription_start_date) 
      : null;
    
    let priceLockDaysRemaining = 0;
    const priceLockActive = diggerProfile.price_locked;

    if (subscriptionStartDate && priceLockActive) {
      const twelveMonthsFromStart = new Date(subscriptionStartDate);
      twelveMonthsFromStart.setMonth(twelveMonthsFromStart.getMonth() + 12);
      
      if (now < twelveMonthsFromStart) {
        priceLockDaysRemaining = Math.ceil((twelveMonthsFromStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Get current pricing for comparison
    const tierKey = `${diggerProfile.geographic_tier}_${diggerProfile.industry_type}`;
    const currentPricing = CURRENT_PRICING[tierKey];
    const currentPriceCents = diggerProfile.billing_cycle === 'annual' 
      ? currentPricing?.annual 
      : currentPricing?.monthly;

    // Get click count for current month
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: clickData } = await supabaseClient
      .from('digger_monthly_clicks')
      .select('click_count')
      .eq('digger_id', digger_profile_id)
      .eq('month_year', currentMonthYear)
      .single();

    const response = {
      subscribed: diggerProfile.subscription_status === 'active',
      subscription_status: diggerProfile.subscription_status,
      geographic_tier: diggerProfile.geographic_tier,
      industry_type: diggerProfile.industry_type,
      billing_cycle: diggerProfile.billing_cycle,
      subscription_tier: diggerProfile.subscription_tier,
      subscription_start_date: diggerProfile.subscription_start_date,
      subscription_end_date: stripeSubscriptionEndDate || diggerProfile.subscription_end_date,
      
      // Price lock info
      price_locked: priceLockActive,
      price_lock_days_remaining: priceLockDaysRemaining,
      original_price_cents: diggerProfile.original_price_cents,
      current_price_cents: currentPriceCents,
      
      // Click tracking
      current_month_clicks: clickData?.click_count || 0,
      
      // Stripe IDs (for frontend use if needed)
      stripe_subscription_id: diggerProfile.stripe_subscription_id,
      stripe_customer_id: diggerProfile.stripe_customer_id,
    };

    logStep("Returning subscription status", response);

    return new Response(JSON.stringify(response), {
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
