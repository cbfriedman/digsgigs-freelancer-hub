import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVEAL-LEAD-CONTACT] ${step}${detailsStr}`);
};

/**
 * Bark pricing as proxy for Angi CPL by industry category
 */
const ANGI_CPL_TIERS = {
  'low-value': { min: 5.50, max: 11.00, average: 8.25 },
  'mid-value': { min: 13.20, max: 19.80, average: 16.50 },
  'high-value': { min: 22.00, max: 48.40, average: 35.20 },
};

const SUBSCRIBER_CPL_MULTIPLIER = 0.65;     // 65% of Angi CPL
const NON_SUBSCRIBER_CPL_MULTIPLIER = 0.90; // 90% of Angi CPL
const GRACE_PERIOD_DAYS = 10;

/**
 * Determine industry category from gig title/description
 */
function getIndustryCategory(title: string, description: string): 'low-value' | 'mid-value' | 'high-value' {
  const text = `${title} ${description}`.toLowerCase();
  
  const highValueKeywords = ['lawyer', 'attorney', 'law', 'insurance', 'mortgage', 'credit repair', 
    'tax', 'financial', 'wealth', 'investment', 'dental', 'medical', 'cpa', 'accounting'];
  const lowValueKeywords = ['cleaning', 'pet', 'tutor', 'moving', 'handyman', 'lawn', 'dog walking',
    'babysitting', 'house sitting', 'data entry', 'virtual assistant'];
  
  if (highValueKeywords.some(kw => text.includes(kw))) return 'high-value';
  if (lowValueKeywords.some(kw => text.includes(kw))) return 'low-value';
  return 'mid-value';
}

function roundToHalfDollar(amount: number): number {
  return Math.ceil(amount * 2) / 2;
}

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

    const { gig_id } = await req.json();
    
    if (!gig_id) {
      throw new Error('gig_id is required');
    }

    logStep("Request received", { gig_id });

    // Get digger profile for this user
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('id, subscription_status, subscription_tier, accumulated_free_clicks, subscription_lapsed_at')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error('No digger profile found');
    }

    logStep("Digger profile fetched", { 
      diggerId: diggerProfile.id,
      tier: diggerProfile.subscription_tier,
      freeClicks: diggerProfile.accumulated_free_clicks,
    });

    // Check if already revealed
    const { data: existingReveal } = await supabaseClient
      .from('contact_reveals')
      .select('id')
      .eq('digger_id', diggerProfile.id)
      .eq('gig_id', gig_id)
      .maybeSingle();

    if (existingReveal) {
      throw new Error('Contact already revealed for this lead');
    }

    // Get gig details
    const { data: gig, error: gigError } = await supabaseClient
      .from('gigs')
      .select('id, title, description, consumer_email, consumer_phone, consumer_id')
      .eq('id', gig_id)
      .single();

    if (gigError || !gig) {
      throw new Error('Gig not found');
    }

    logStep("Gig fetched", { title: gig.title });

    // Determine subscription status and grace period
    const isActiveSubscriber = diggerProfile.subscription_status === 'active';
    let isInGracePeriod = false;
    
    if (!isActiveSubscriber && diggerProfile.subscription_lapsed_at) {
      const lapsedAt = new Date(diggerProfile.subscription_lapsed_at);
      const gracePeriodEnd = new Date(lapsedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      isInGracePeriod = new Date() < gracePeriodEnd;
    }

    const hasSubscriberBenefits = isActiveSubscriber || isInGracePeriod;
    const freeClicks = diggerProfile.accumulated_free_clicks || 0;

    logStep("Subscription status", { isActiveSubscriber, isInGracePeriod, freeClicks });

    // Determine pricing
    const category = getIndustryCategory(gig.title, gig.description);
    const angiCpl = ANGI_CPL_TIERS[category].average;
    
    let costCents = 0;
    let usedFreeClick = false;
    let discountApplied = '';

    if (hasSubscriberBenefits && freeClicks > 0) {
      // Use free click
      usedFreeClick = true;
      costCents = 0;
      discountApplied = 'Free click (subscriber benefit)';
      
      // Decrement free clicks
      await supabaseClient
        .from('digger_profiles')
        .update({ 
          accumulated_free_clicks: freeClicks - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', diggerProfile.id);
        
      logStep("Used free click", { remainingClicks: freeClicks - 1 });
      
    } else {
      // Calculate paid cost
      const multiplier = hasSubscriberBenefits ? SUBSCRIBER_CPL_MULTIPLIER : NON_SUBSCRIBER_CPL_MULTIPLIER;
      const costDollars = roundToHalfDollar(angiCpl * multiplier);
      costCents = Math.round(costDollars * 100);
      discountApplied = hasSubscriberBenefits 
        ? `Subscriber rate (${Math.round(SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL)`
        : `Non-subscriber rate (${Math.round(NON_SUBSCRIBER_CPL_MULTIPLIER * 100)}% of Angi CPL)`;
        
      logStep("Calculated paid cost", { costCents, multiplier, angiCpl });
    }

    // Record the reveal
    const { data: revealRecord, error: revealError } = await supabaseClient
      .from('contact_reveals')
      .insert({
        digger_id: diggerProfile.id,
        gig_id,
        cost_cents: costCents,
        used_free_click: usedFreeClick,
        industry_category: category,
        subscription_tier: diggerProfile.subscription_tier,
      })
      .select()
      .single();

    if (revealError) {
      throw new Error(`Failed to record reveal: ${revealError.message}`);
    }

    logStep("Reveal recorded", { revealId: revealRecord.id });

    // Return the contact info
    return new Response(JSON.stringify({
      success: true,
      revealId: revealRecord.id,
      contactInfo: {
        email: gig.consumer_email,
        phone: gig.consumer_phone,
        consumerId: gig.consumer_id,
      },
      pricing: {
        costCents,
        costDollars: costCents / 100,
        usedFreeClick,
        remainingFreeClicks: usedFreeClick ? freeClicks - 1 : freeClicks,
        industryCategory: category,
        discountApplied,
      },
    }), {
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
