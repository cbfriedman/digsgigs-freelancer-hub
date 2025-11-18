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
    let freeEstimateCredit = 0;

    // Check if this lead was purchased as a free estimate (to apply rebate)
    const freeEstimatePricing = { free: 150, pro: 100, premium: 50 };
    const wasFreeEstimate = leadPurchase.purchase_price === freeEstimatePricing[tier];
    
    if (wasFreeEstimate) {
      freeEstimateCredit = leadPurchase.purchase_price;
      logStep("Free estimate detected - will apply rebate", { freeEstimateCredit });
    }

    // Calculate base award cost based on pricing model and tier
    if (pricingModel === 'fixed' && projectAmount) {
      // Fixed price: Percentage-based award fee (10%/6%/3%)
      const awardFeePercentages = { free: 0.10, pro: 0.06, premium: 0.03 };
      awardCost = projectAmount * awardFeePercentages[tier];
      logStep("Fixed price award cost calculated", { awardCost, percentage: awardFeePercentages[tier] * 100 });
    } else if (pricingModel === 'hourly') {
      // Hourly: 3x/2x/1x average hourly rate
      const hourlyMin = leadPurchase.digger_profiles.hourly_rate_min || 0;
      const hourlyMax = leadPurchase.digger_profiles.hourly_rate_max || 0;
      const averageRate = (hourlyMin + hourlyMax) / 2;
      
      const multipliers = { free: 3, pro: 2, premium: 1 };
      awardCost = averageRate * multipliers[tier];
      logStep("Hourly award cost calculated", { awardCost, averageRate, multiplier: multipliers[tier] });
    } else if (pricingModel === 'free_estimate') {
      // Free estimate: Use the new pricing structure
      awardCost = freeEstimatePricing[tier];
      logStep("Free estimate cost calculated", { awardCost });
    }

    // Apply rebate if free estimate was already paid
    // New rules: Only apply rebates for fixed-price contracts of $5,000 or more
    // No rebates for hourly rate contracts
    let rebateApplied = false;
    if (freeEstimateCredit > 0) {
      if (pricingModel === 'fixed' && projectAmount && projectAmount >= 5000) {
        awardCost = Math.max(0, awardCost - freeEstimateCredit);
        rebateApplied = true;
        logStep("Rebate applied - meets criteria (fixed-price >= $5,000)", { 
          originalCost: awardCost + freeEstimateCredit, 
          rebate: freeEstimateCredit, 
          finalCost: awardCost,
          projectAmount 
        });
      } else if (pricingModel === 'hourly') {
        logStep("Rebate NOT applied - hourly contracts excluded", { freeEstimateCredit });
      } else if (pricingModel === 'fixed' && (!projectAmount || projectAmount < 5000)) {
        logStep("Rebate NOT applied - award under $5,000", { projectAmount, freeEstimateCredit });
      } else {
        logStep("Rebate NOT applied - criteria not met", { pricingModel, projectAmount, freeEstimateCredit });
      }
    }

    // Store award cost in metadata (we'll add a metadata field if needed)
    // For now, we'll return the calculated cost
    return new Response(JSON.stringify({ 
      success: true,
      awardCost,
      freeEstimateCredit,
      rebateApplied,
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
