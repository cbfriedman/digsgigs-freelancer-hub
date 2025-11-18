import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get digger profile
    const { data: diggerProfile } = await supabaseClient
      .from('digger_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!diggerProfile) {
      logStep("No digger profile found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: 'free',
        commission_rate: 0.09
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check Stripe for active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      
      // Update digger profile to free tier
      await supabaseClient
        .from('digger_profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null
        })
        .eq('id', diggerProfile.id);

      return new Response(JSON.stringify({
        subscribed: false,
        tier: 'free',
        commission_rate: 0.09
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      
      await supabaseClient
        .from('digger_profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null,
          stripe_customer_id: customerId
        })
        .eq('id', diggerProfile.id);

      return new Response(JSON.stringify({
        subscribed: false,
        tier: 'free',
        commission_rate: 0.09
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const productId = subscription.items.data[0].price.product as string;
    
    logStep("Active subscription found", { subscriptionId: subscription.id, productId });

    // Determine tier and commission rate based on product ID
    let tier = 'free';
    let commissionRate = 0.09;
    
    if (productId === 'prod_TQ0mK76zTAwoQc') { // Pro tier
      tier = 'pro';
      commissionRate = 0.04;
    } else if (productId === 'prod_TQ0oKMEtoOhHO7') { // Premium tier
      tier = 'premium';
      commissionRate = 0.00;
    }

    // Update digger profile
    await supabaseClient
      .from('digger_profiles')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_end_date: subscriptionEnd,
        stripe_customer_id: customerId
      })
      .eq('id', diggerProfile.id);

    logStep("Subscription details", { tier, commissionRate });

    return new Response(JSON.stringify({
      subscribed: true,
      tier,
      commission_rate: commissionRate,
      subscription_end: subscriptionEnd
    }), {
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
