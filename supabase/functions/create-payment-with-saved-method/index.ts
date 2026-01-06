import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-WITH-SAVED-METHOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { 
      paymentMethodId, 
      amount, 
      description,
      metadata = {}
    } = await req.json();

    if (!paymentMethodId || !amount) {
      throw new Error('Missing required parameters: paymentMethodId and amount');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create Stripe customer
    let customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length === 0) {
      logStep("Creating new Stripe customer");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    } else {
      customerId = customers.data[0].id;
    }

    logStep("Using Stripe customer", { customerId });

    // Verify payment method belongs to user
    const { data: pmRecord } = await supabaseClient
      .from('payment_methods')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .eq('user_id', user.id)
      .single();

    if (!pmRecord) {
      throw new Error('Payment method not found or unauthorized');
    }

    // Create Payment Intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      description: description || 'Payment',
      metadata: {
        userId: user.id,
        ...metadata,
      },
      return_url: `${req.headers.get('origin')}/payment-success`,
    });

    logStep("Payment Intent created", { 
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status 
    });

    // If payment requires additional action (3D Secure, etc.)
    if (paymentIntent.status === 'requires_action') {
      return new Response(
        JSON.stringify({ 
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If payment succeeded immediately
    if (paymentIntent.status === 'succeeded') {
      return new Response(
        JSON.stringify({ 
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Other statuses
    return new Response(
      JSON.stringify({ 
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
