import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-FOUNDING-STATUS] ${step}${detailsStr}`);
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

    const body = await req.json().catch(() => ({}));
    const { digger_id } = body;

    // Get digger profile - either by digger_id or user_id
    let profileQuery = supabaseClient
      .from('digger_profiles')
      .select('id, is_founding_digger, founding_digger_number, lead_price_lock_expires_at, price_locked, subscription_status');
    
    if (digger_id) {
      profileQuery = profileQuery.eq('id', digger_id);
    } else {
      profileQuery = profileQuery.eq('user_id', user.id).eq('is_primary', true);
    }

    const { data: diggerProfile, error: profileError } = await profileQuery.single();

    if (profileError || !diggerProfile) {
      throw new Error('No digger profile found');
    }

    logStep("Digger profile fetched", { 
      diggerId: diggerProfile.id,
      isFoundingDigger: diggerProfile.is_founding_digger,
    });

    // Get current program status
    const { data: programSettings } = await supabaseClient
      .from('platform_settings')
      .select('value')
      .eq('key', 'founding_digger_program')
      .single();

    const program = programSettings?.value || { status: 'closed', limit: 500, current_count: 0 };

    // Calculate lead price lock status
    const now = new Date();
    const leadPriceLockExpires = diggerProfile.lead_price_lock_expires_at 
      ? new Date(diggerProfile.lead_price_lock_expires_at) 
      : null;
    const leadPriceLocked = leadPriceLockExpires ? now < leadPriceLockExpires : false;
    
    // Calculate days remaining
    let daysRemaining = 0;
    if (leadPriceLockExpires && leadPriceLocked) {
      daysRemaining = Math.ceil((leadPriceLockExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const response = {
      // Digger-specific info
      isFoundingDigger: diggerProfile.is_founding_digger || false,
      foundingDiggerNumber: diggerProfile.founding_digger_number,
      
      // Subscription pricing (forever for Founding Diggers)
      subscriptionPriceLocked: diggerProfile.is_founding_digger && diggerProfile.price_locked,
      subscriptionPriceCents: diggerProfile.is_founding_digger ? 1900 : null,
      
      // Lead pricing (1 year lock for Founding Diggers)
      leadPriceLocked,
      leadPriceLockExpiresAt: diggerProfile.lead_price_lock_expires_at,
      leadPriceLockDaysRemaining: daysRemaining,
      
      // Founding Digger lead prices (when locked)
      foundingLeadPrices: leadPriceLocked ? {
        lowValueCents: 1000,  // $10
        highValueCents: 2500, // $25
      } : null,
      
      // Program status
      program: {
        status: program.status,
        limit: program.limit,
        currentCount: program.current_count,
        remainingSpots: Math.max(0, program.limit - program.current_count),
        isOpen: program.status === 'open' && program.current_count < program.limit,
      },
    };

    logStep("Response prepared", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
