import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PRICE-LOCKS] ${step}${detailsStr}`);
};

// Price lock configuration
const PRICE_LOCK_CLICK_THRESHOLD = 2;
const PRICE_LOCK_PERIOD_MONTHS = 12;

// Current pricing (should match subscription_pricing table)
const CURRENT_PRICING: Record<string, { monthly: number; annual: number; monthlyPriceId: string; annualPriceId: string }> = {
  local_lv_mv: { monthly: 1900, annual: 19000, monthlyPriceId: 'price_1ShJOkRuFpm7XGfuldUtDYCW', annualPriceId: 'price_1ShJOyRuFpm7XGfuBzBRR8jh' },
  local_hv: { monthly: 3900, annual: 39000, monthlyPriceId: 'price_1ShJPxRuFpm7XGfuFsl8EDpz', annualPriceId: 'price_1ShJQrRuFpm7XGfuzHnllY63' },
  statewide_lv_mv: { monthly: 4900, annual: 49000, monthlyPriceId: 'price_1ShJR4RuFpm7XGfuDnd5zQBW', annualPriceId: 'price_1ShJRFRuFpm7XGfuH23MrcKN' },
  statewide_hv: { monthly: 9900, annual: 99000, monthlyPriceId: 'price_1ShJRTRuFpm7XGfuOeU7QREH', annualPriceId: 'price_1ShJRhRuFpm7XGfupcbZV55Z' },
  nationwide_lv_mv: { monthly: 9900, annual: 99000, monthlyPriceId: 'price_1ShJRuRuFpm7XGfuD6GZfhv2', annualPriceId: 'price_1ShJT2RuFpm7XGfueqAqc2DP' },
  nationwide_hv: { monthly: 19900, annual: 199000, monthlyPriceId: 'price_1ShJTnRuFpm7XGfuMQPfNwDk', annualPriceId: 'price_1ShJU2RuFpm7XGfu9oO3NF4Y' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - checking price locks");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get previous month for click checking
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYear = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    logStep("Checking clicks for previous month", { prevMonthYear });

    // Find all diggers with active subscriptions that started > 12 months ago
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - PRICE_LOCK_PERIOD_MONTHS, now.getDate());

    const { data: eligibleDiggers, error: fetchError } = await supabaseClient
      .from('digger_profiles')
      .select('id, user_id, geographic_tier, industry_type, billing_cycle, subscription_start_date, original_price_cents, price_locked, stripe_subscription_id')
      .eq('subscription_status', 'active')
      .eq('price_locked', true)
      .lt('subscription_start_date', twelveMonthsAgo.toISOString());

    if (fetchError) {
      logStep("Error fetching eligible diggers", { error: fetchError });
      throw new Error("Failed to fetch digger profiles");
    }

    logStep("Found eligible diggers for price lock check", { count: eligibleDiggers?.length || 0 });

    const results = {
      checked: 0,
      priceLockContinued: 0,
      priceLockRemoved: 0,
      errors: [] as string[],
    };

    for (const digger of eligibleDiggers || []) {
      results.checked++;
      
      try {
        // Get click count for previous month
        const { data: clickData, error: clickError } = await supabaseClient
          .from('digger_monthly_clicks')
          .select('click_count')
          .eq('digger_id', digger.id)
          .eq('month_year', prevMonthYear)
          .single();

        const clickCount = clickData?.click_count || 0;
        logStep("Click count for digger", { diggerId: digger.id, clickCount, prevMonthYear });

        if (clickCount >= PRICE_LOCK_CLICK_THRESHOLD) {
          // Price lock should be removed - update to current rates
          logStep("Removing price lock", { diggerId: digger.id, clickCount });

          // Get current pricing for their tier
          const tierKey = `${digger.geographic_tier}_${digger.industry_type}`;
          const currentPricing = CURRENT_PRICING[tierKey];

          if (!currentPricing) {
            logStep("Unknown tier, skipping", { tierKey });
            results.errors.push(`Unknown tier ${tierKey} for digger ${digger.id}`);
            continue;
          }

          // Update Stripe subscription to new price if different
          if (digger.stripe_subscription_id) {
            try {
              const subscription = await stripe.subscriptions.retrieve(digger.stripe_subscription_id);
              const currentItem = subscription.items.data[0];
              
              if (currentItem) {
                const newPriceId = digger.billing_cycle === 'annual' 
                  ? currentPricing.annualPriceId 
                  : currentPricing.monthlyPriceId;

                // Only update if price is different
                if (currentItem.price.id !== newPriceId) {
                  await stripe.subscriptions.update(digger.stripe_subscription_id, {
                    items: [
                      {
                        id: currentItem.id,
                        price: newPriceId,
                      },
                    ],
                    proration_behavior: 'create_prorations',
                  });
                  logStep("Updated Stripe subscription price", { 
                    diggerId: digger.id, 
                    oldPriceId: currentItem.price.id, 
                    newPriceId 
                  });
                }
              }
            } catch (stripeError) {
              logStep("Error updating Stripe subscription", { error: stripeError });
              results.errors.push(`Stripe update failed for digger ${digger.id}: ${stripeError}`);
            }
          }

          // Update database
          const { error: updateError } = await supabaseClient
            .from('digger_profiles')
            .update({
              price_locked: false,
              original_price_cents: digger.billing_cycle === 'annual' 
                ? currentPricing.annual 
                : currentPricing.monthly,
            })
            .eq('id', digger.id);

          if (updateError) {
            logStep("Error updating digger profile", { error: updateError });
            results.errors.push(`DB update failed for digger ${digger.id}: ${updateError.message}`);
          } else {
            results.priceLockRemoved++;
          }
        } else {
          // Price lock continues (< 2 clicks)
          logStep("Price lock continues", { diggerId: digger.id, clickCount });
          results.priceLockContinued++;
        }
      } catch (diggerError) {
        logStep("Error processing digger", { diggerId: digger.id, error: diggerError });
        results.errors.push(`Error processing digger ${digger.id}: ${diggerError}`);
      }
    }

    logStep("Price lock check completed", results);

    return new Response(JSON.stringify(results), {
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
