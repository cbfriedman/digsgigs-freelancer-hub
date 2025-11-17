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
      .select('subscription_tier, hourly_rate, hourly_rate_min, pricing_model')
      .eq('user_id', user.id)
      .single();

    const tier = diggerProfile?.subscription_tier || 'free';
    const pricingModel = diggerProfile?.pricing_model || 'both';
    logStep("Digger profile retrieved", { tier, hourlyRate: diggerProfile?.hourly_rate, pricingModel });

    // Calculate lead cost based on pricing model
    let leadCost = 3; // Default: free tier ($3 per lead)
    let isHourlyRate = false;
    
    // If pricing model is 'hourly', charge based on hourly rate
    if (pricingModel === 'hourly') {
      if (diggerProfile?.hourly_rate || diggerProfile?.hourly_rate_min) {
        const hourlyRate = diggerProfile.hourly_rate || diggerProfile.hourly_rate_min;
        leadCost = Math.max(100, hourlyRate);
        isHourlyRate = true;
        logStep("Hourly rate lead cost", { hourlyRate, leadCost, minimum: 100 });
      } else {
        // No hourly rate set, fall back to tier-based
        logStep("Hourly pricing selected but no rate set, using tier-based pricing");
        if (tier === 'premium') {
          leadCost = 0;
        } else if (tier === 'pro') {
          leadCost = 1.5;
        } else {
          leadCost = 3;
        }
      }
    } 
    // If pricing model is 'commission', use tier-based pricing
    else if (pricingModel === 'commission') {
      if (tier === 'premium') {
        leadCost = 0; // $0 per lead
      } else if (tier === 'pro') {
        leadCost = 1.5; // $1.50 per lead
      } else {
        leadCost = 3; // $3 per lead (free)
      }
      logStep("Commission-based lead cost", { tier, leadCost });
    }
    // If pricing model is 'both' (construction/trades), prefer hourly if set, otherwise tier-based
    else if (pricingModel === 'both') {
      if (diggerProfile?.hourly_rate || diggerProfile?.hourly_rate_min) {
        const hourlyRate = diggerProfile.hourly_rate || diggerProfile.hourly_rate_min;
        leadCost = Math.max(100, hourlyRate);
        isHourlyRate = true;
        logStep("Both pricing - hourly rate lead cost", { hourlyRate, leadCost, minimum: 100 });
      } else {
        // No hourly rate set, use tier-based
        if (tier === 'premium') {
          leadCost = 0;
        } else if (tier === 'pro') {
          leadCost = 1.5;
        } else {
          leadCost = 3;
        }
        logStep("Both pricing - tier-based lead cost", { tier, leadCost });
      }
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
