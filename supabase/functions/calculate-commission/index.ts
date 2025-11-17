import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-COMMISSION] ${step}${detailsStr}`);
};

interface CommissionResult {
  tier: string;
  rate: number;
  total_amount: number;
  commission_amount: number;
  digger_payout: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { diggerId, totalAmount } = await req.json();

    if (!diggerId || !totalAmount) {
      throw new Error('Missing required parameters: diggerId and totalAmount');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get digger's subscription tier
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_tier')
      .eq('id', diggerId)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error('Digger profile not found');
    }

    const tier = diggerProfile.subscription_tier || 'free';
    let commissionRate = 0.09; // Default: free tier (9%)
    let minimumFee = 0; // No minimum fees

    // Determine commission rate and minimum based on tier
    if (tier === 'premium') {
      commissionRate = 0.00; // 0% commission
      minimumFee = 0; // No minimum
    } else if (tier === 'pro') {
      commissionRate = 0.06; // 6% commission
      minimumFee = 0; // No minimum
    } else {
      commissionRate = 0.09; // 9% commission (free)
      minimumFee = 0; // No minimum
    }

    // Calculate commission with minimum
    const calculatedCommission = totalAmount * commissionRate;
    const commissionAmount = Math.max(calculatedCommission, minimumFee);
    const diggerPayout = totalAmount - commissionAmount;

    logStep("Commission calculated", {
      tier,
      rate: commissionRate,
      totalAmount,
      calculatedCommission,
      minimumFee,
      commissionAmount,
      diggerPayout
    });

    const result: CommissionResult = {
      tier,
      rate: commissionRate,
      total_amount: totalAmount,
      commission_amount: commissionAmount,
      digger_payout: diggerPayout
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
