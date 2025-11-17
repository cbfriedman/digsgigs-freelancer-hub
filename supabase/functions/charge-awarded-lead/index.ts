import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-AWARDED-LEAD] ${step}${detailsStr}`);
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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id });

    const { leadPurchaseId } = await req.json();
    if (!leadPurchaseId) throw new Error('Lead purchase ID is required');

    logStep("Processing awarded lead charge", { leadPurchaseId });

    // Get the lead purchase details
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .select(`
        *,
        digger:digger_profiles!inner(
          id,
          user_id,
          hourly_rate,
          hourly_rate_min,
          pricing_model,
          stripe_customer_id
        ),
        gig:gigs!inner(
          id,
          title
        )
      `)
      .eq('id', leadPurchaseId)
      .single();

    if (purchaseError || !leadPurchase) {
      throw new Error('Lead purchase not found');
    }

    // Verify the authenticated user is the digger who purchased this lead
    if (leadPurchase.digger.user_id !== user.id) {
      throw new Error('Unauthorized: You can only be charged for your own leads');
    }

    const pricingModel = leadPurchase.digger.pricing_model;
    
    // Only charge hourly rate for 'hourly' or 'both' pricing models
    if (pricingModel !== 'hourly' && pricingModel !== 'both') {
      logStep("Pricing model doesn't require hourly charge", { pricingModel });
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No hourly charge required for this pricing model',
        chargeAmount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get hourly rate
    const hourlyRate = leadPurchase.digger.hourly_rate || leadPurchase.digger.hourly_rate_min;
    if (!hourlyRate || hourlyRate <= 0) {
      throw new Error('No valid hourly rate found for digger');
    }

    const chargeAmount = Math.round(hourlyRate * 100); // Convert to cents
    logStep("Calculated hourly charge", { hourlyRate, chargeAmountCents: chargeAmount });

    // Get or create Stripe customer
    let customerId = leadPurchase.digger.stripe_customer_id;
    
    if (!customerId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile?.email) throw new Error('User email not found');

      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: user.id,
          digger_id: leadPurchase.digger.id,
        },
      });

      customerId = customer.id;

      // Update digger profile with Stripe customer ID
      await supabaseClient
        .from('digger_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', leadPurchase.digger.id);

      logStep("Created new Stripe customer", { customerId });
    }

    // Create payment intent for hourly charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: 'usd',
      customer: customerId,
      description: `Hourly lead charge for awarded gig: ${leadPurchase.gig.title}`,
      metadata: {
        lead_purchase_id: leadPurchaseId,
        digger_id: leadPurchase.digger.id,
        gig_id: leadPurchase.gig.id,
        charge_type: 'awarded_hourly_lead',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    logStep("Payment intent created", { 
      paymentIntentId: paymentIntent.id,
      amount: chargeAmount 
    });

    // Update lead purchase with payment intent ID
    await supabaseClient
      .from('lead_purchases')
      .update({ 
        stripe_payment_id: paymentIntent.id,
        status: 'awarded_pending_payment'
      })
      .eq('id', leadPurchaseId);

    return new Response(JSON.stringify({ 
      success: true,
      clientSecret: paymentIntent.client_secret,
      chargeAmount: hourlyRate,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in charge-awarded-lead", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
