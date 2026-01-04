import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-PROFILE-VIEW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Service role client for admin operations (click tracking)
  const supabaseServiceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { diggerId } = await req.json();
    
    if (!diggerId) {
      throw new Error("Missing required field: diggerId");
    }

    logStep("Request data", { diggerId });

    // CRITICAL: Check if user (gigger) has posted any gigs
    const { data: userGigs, error: gigsError } = await supabaseServiceClient
      .from('gigs')
      .select('id')
      .eq('consumer_id', user.id)
      .limit(1);

    if (gigsError) {
      throw new Error(`Failed to check user gigs: ${gigsError.message}`);
    }

    if (!userGigs || userGigs.length === 0) {
      logStep("User has no posted gigs - access denied");
      return new Response(JSON.stringify({ 
        error: "You must post at least one gig before you can view digger profiles.",
        requiresGig: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // CRITICAL: Check if this digger is related to any of the gigger's posted gigs
    const { data: relatedGigs, error: relatedError } = await supabaseServiceClient
      .from('gigs')
      .select(`
        id,
        lead_purchases!inner(digger_id),
        lead_exclusivity_queue!inner(digger_id)
      `)
      .eq('consumer_id', user.id)
      .or(`lead_purchases.digger_id.eq.${diggerId},lead_exclusivity_queue.digger_id.eq.${diggerId}`)
      .limit(1);

    if (relatedError) {
      // Try alternative query without joins
      const { data: purchases } = await supabaseServiceClient
        .from('lead_purchases')
        .select('gig_id')
        .eq('digger_id', diggerId)
        .limit(1)
        .single();

      const { data: queue } = await supabaseServiceClient
        .from('lead_exclusivity_queue')
        .select('gig_id')
        .eq('digger_id', diggerId)
        .limit(1)
        .single();

      const gigIds = [
        ...(purchases ? [purchases.gig_id] : []),
        ...(queue ? [queue.gig_id] : [])
      ];

      if (gigIds.length === 0) {
        logStep("Digger not related to gigger's gigs - access denied");
        return new Response(JSON.stringify({ 
          error: "You can only view diggers that are related to your posted gigs.",
          notRelated: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const { data: gigCheck } = await supabaseServiceClient
        .from('gigs')
        .select('id')
        .eq('consumer_id', user.id)
        .in('id', gigIds)
        .limit(1);

      if (!gigCheck || gigCheck.length === 0) {
        logStep("Digger not related to gigger's gigs - access denied");
        return new Response(JSON.stringify({ 
          error: "You can only view diggers that are related to your posted gigs.",
          notRelated: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    } else if (!relatedGigs || relatedGigs.length === 0) {
      logStep("Digger not related to gigger's gigs - access denied");
      return new Response(JSON.stringify({ 
        error: "You can only view diggers that are related to your posted gigs.",
        notRelated: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get digger profile
    const { data: diggerProfile, error: diggerError } = await supabaseServiceClient
      .from('digger_profiles')
      .select('subscription_status, subscription_tier, business_name, user_id, id, profession, stripe_customer_id')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    logStep("Digger profile found", { 
      subscription_status: diggerProfile.subscription_status,
      tier: diggerProfile.subscription_tier 
    });

    // Check if user has already viewed this profile
    const { data: existingView } = await supabaseServiceClient
      .from('profile_views')
      .select('*')
      .eq('consumer_id', user.id)
      .eq('digger_id', diggerId)
      .single();

    if (existingView) {
      logStep("Profile already viewed, no charge");
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyPaid: true,
        message: "Contact info already unlocked"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate the price the digger will pay
    // Call the calculate-profile-click-price function via HTTP
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const priceResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-profile-click-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ digger_profile_id: diggerId, price_type: 'click' }),
    });

    if (!priceResponse.ok) {
      throw new Error(`Failed to calculate price: ${priceResponse.statusText}`);
    }

    const priceData = await priceResponse.json();
    const costCents = priceData.costCents || 5000; // Default to $50 if calculation fails
    logStep("Price calculated", { costCents });

    // Get or create Stripe customer for digger
    let customerId = diggerProfile.stripe_customer_id;
    
    if (!customerId) {
      const { data: profile } = await supabaseServiceClient
        .from('profiles')
        .select('email')
        .eq('id', diggerProfile.user_id)
        .single();

      if (!profile?.email) throw new Error('Digger email not found');

      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: diggerProfile.user_id,
          digger_id: diggerProfile.id,
        },
      });

      customerId = customer.id;

      // Update digger profile with Stripe customer ID
      await supabaseServiceClient
        .from('digger_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', diggerProfile.id);

      logStep("Created new Stripe customer for digger", { customerId });
    }

    // Create payment intent to charge the digger
    const paymentIntent = await stripe.paymentIntents.create({
      amount: costCents,
      currency: 'usd',
      customer: customerId,
      description: `Profile view charge - Gigger clicked your profile`,
      metadata: {
        digger_id: diggerProfile.id,
        consumer_id: user.id,
        charge_type: 'profile_view',
        price_type: 'click',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    logStep("Payment intent created", { 
      paymentIntentId: paymentIntent.id,
      amount: costCents 
    });

    // Record the profile click (for tracking)
    const { error: clickError } = await supabaseServiceClient
      .from('profile_clicks')
      .insert({
        digger_profile_id: diggerId,
        consumer_id: user.id,
        cost_cents: costCents,
        keyword_matched: priceData.matchedKeyword || null,
        google_avg_cpc_cents: priceData.baseCpc ? Math.round(priceData.baseCpc * 100) : null,
      });

    if (clickError) {
      logStep("Warning: Failed to record profile click", { error: clickError });
    }

    // Record the profile view (unlocks contact info)
    const { error: viewError } = await supabaseServiceClient
      .from('profile_views')
      .insert({
        consumer_id: user.id,
        digger_id: diggerId,
        amount_charged: costCents / 100, // Store in dollars
      });

    if (viewError) {
      throw new Error(`Failed to record profile view: ${viewError.message}`);
    }

    logStep("Profile view recorded and digger charged", { 
      consumerId: user.id, 
      diggerId,
      paymentIntentId: paymentIntent.id
    });

    return new Response(JSON.stringify({ 
      success: true,
      charged: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: costCents / 100,
      message: "Contact info unlocked - Digger has been charged"
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