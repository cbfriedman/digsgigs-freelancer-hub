import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-AWARD-COST] ${step}${detailsStr}`);
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

    const { leadPurchaseId, projectAmount, pricingModel } = await req.json();
    
    if (!leadPurchaseId) {
      throw new Error("Missing leadPurchaseId");
    }

    logStep("Request data", { leadPurchaseId, projectAmount, pricingModel });

    // Get lead purchase details
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .select(`
        *,
        digger_profiles!inner(subscription_tier, hourly_rate_min, hourly_rate_max)
      `)
      .eq('id', leadPurchaseId)
      .single();

    if (purchaseError || !leadPurchase) {
      throw new Error("Lead purchase not found");
    }

    logStep("Lead purchase found", { leadPurchase });

    const tier = (leadPurchase.digger_profiles.subscription_tier || 'free') as 'free' | 'pro' | 'premium';
    let awardCost = 0;

    // Calculate award cost based on pricing model and tier
    if (pricingModel === 'fixed' && projectAmount) {
      // Fixed price: 6%/3%/0% of project total
      const commissionRates = { free: 0.06, pro: 0.03, premium: 0.00 };
      awardCost = projectAmount * commissionRates[tier];
      logStep("Fixed price award cost calculated", { awardCost, rate: commissionRates[tier] });
    } else if (pricingModel === 'hourly') {
      // Hourly: 3x/2x/1x average hourly rate
      const hourlyMin = leadPurchase.digger_profiles.hourly_rate_min || 0;
      const hourlyMax = leadPurchase.digger_profiles.hourly_rate_max || 0;
      const averageRate = (hourlyMin + hourlyMax) / 2;
      
      const multipliers = { free: 3, pro: 2, premium: 1 };
      awardCost = averageRate * multipliers[tier];
      logStep("Hourly award cost calculated", { awardCost, averageRate, multiplier: multipliers[tier] });
    } else if (pricingModel === 'free_estimate') {
      // Free estimate cost will be deducted from award fee
      // For free tier, this is $1; for pro/premium it's $0
      awardCost = tier === 'free' ? 1 : 0;
      logStep("Free estimate cost calculated", { awardCost });
    }

    // Store award cost in metadata (we'll add a metadata field if needed)
    // For now, we'll return the calculated cost
    return new Response(JSON.stringify({ 
      success: true,
      awardCost,
      tier,
      pricingModel,
      leadPurchaseId
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
