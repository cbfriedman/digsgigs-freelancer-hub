import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-LEAD-PRICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id });

    // Get digger's subscription tier, hourly rate, and pricing model
    const { data: diggerProfile } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_tier, hourly_rate_min, hourly_rate_max, pricing_model')
      .eq('user_id', user.id)
      .single();

    const tier = diggerProfile?.subscription_tier || 'free';
    const pricingModel = diggerProfile?.pricing_model || 'both';
    
    // Calculate average hourly rate
    const hourlyMin = diggerProfile?.hourly_rate_min || 0;
    const hourlyMax = diggerProfile?.hourly_rate_max || 0;
    const averageRate = (hourlyMin + hourlyMax) / 2;
    
    logStep("Digger profile retrieved", { tier, hourlyMin, hourlyMax, averageRate, pricingModel });

    // Calculate lead cost based on pricing model
    // For all pricing models, upfront cost is tier-based only
    // Hourly rate is charged separately when lead is awarded
    let leadCost = 20; // Default: free tier ($20 per lead)
    let isHourlyRate = false;
    
    // Get tier-based cost (this is what's charged upfront)
    if (tier === 'premium') {
      leadCost = 5;
    } else if (tier === 'pro') {
      leadCost = 10;
    } else {
      leadCost = 20; // Free tier
    }
    
    // Log pricing model for tracking, but upfront cost is always tier-based
    if (pricingModel === 'hourly' && averageRate > 0) {
      isHourlyRate = true;
      // Apply tier multipliers: Free: 3x, Pro: 2x, Premium: 1x
      const multipliers: Record<string, number> = { free: 3, pro: 2, premium: 1 };
      const multiplier = multipliers[tier] || 3;
      const hourlyCharge = averageRate * multiplier;
      
      logStep("Hourly pricing - upfront tier cost only", { 
        tierBasedCost: leadCost, 
        averageRate,
        multiplier,
        hourlyCharge: `${multiplier} hours at $${averageRate.toFixed(2)} = $${hourlyCharge.toFixed(2)}`,
        note: "Hourly rate charged when awarded" 
      });
    } else if (pricingModel === 'both' && averageRate > 0) {
      isHourlyRate = true;
      const multipliers: Record<string, number> = { free: 3, pro: 2, premium: 1 };
      const multiplier = multipliers[tier] || 3;
      const hourlyCharge = averageRate * multiplier;
      
      logStep("Both pricing - upfront tier cost only", { 
        tierBasedCost: leadCost, 
        averageRate,
        multiplier,
        hourlyCharge: `${multiplier} hours at $${averageRate.toFixed(2)} = $${hourlyCharge.toFixed(2)}`,
        note: "Hourly rate charged when awarded" 
      });
    } else {
      logStep("Commission pricing - tier-based lead cost", { tier, leadCost });
    }

    logStep("Lead cost calculated", { tier, leadCost, isHourlyRate });

    return new Response(JSON.stringify({ 
      leadCost,
      tier,
      isHourlyRate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in calculate-lead-price", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
