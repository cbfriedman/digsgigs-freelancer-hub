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

    // Extract and verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user from the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id });

    const { diggerId, totalAmount } = await req.json();

    if (!diggerId || !totalAmount) {
      throw new Error('Missing required parameters: diggerId and totalAmount');
    }

    // Get digger profile and verify ownership
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_tier, user_id')
      .eq('id', diggerId)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error('Digger profile not found');
    }

    // Authorization check: user must own the digger profile or be admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (diggerProfile.user_id !== user.id && !isAdmin) {
      logStep("Authorization failed", { userId: user.id, profileUserId: diggerProfile.user_id });
      return new Response(JSON.stringify({ error: 'Not authorized to access this profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const tier = diggerProfile.subscription_tier || 'free';
    let escrowFeeRate = 0.09; // Default: free tier (9%)
    let minimumFee = 10; // $10 minimum per payment

    // Determine escrow fee rate based on tier (these are escrow fees, not commissions)
    if (tier === 'premium') {
      escrowFeeRate = 0.04; // 4% escrow fee
    } else if (tier === 'pro') {
      escrowFeeRate = 0.08; // 8% escrow fee
    } else {
      escrowFeeRate = 0.09; // 9% escrow fee (free)
    }

    // Calculate escrow fee with minimum
    const calculatedFee = totalAmount * escrowFeeRate;
    const commissionAmount = Math.max(calculatedFee, minimumFee);
    const diggerPayout = totalAmount - commissionAmount;

    logStep("Escrow fee calculated", {
      tier,
      rate: escrowFeeRate,
      totalAmount,
      calculatedFee,
      minimumFee,
      commissionAmount,
      diggerPayout
    });

    const result: CommissionResult = {
      tier,
      rate: escrowFeeRate,
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
