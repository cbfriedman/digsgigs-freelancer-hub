import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log('Webhook event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { gigId, diggerId, amount, tier } = session.metadata || {};

      if (!gigId || !diggerId || !amount) {
        throw new Error('Missing metadata in session');
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get the consumer_id for this gig
      const { data: gigData } = await supabaseClient
        .from('gigs')
        .select('consumer_id')
        .eq('id', gigId)
        .single();

      if (!gigData) {
        throw new Error('Gig not found');
      }

      // Calculate purchase price based on tier
      const purchasePrice = parseFloat(amount);

      // Record the purchase
      const { error: insertError } = await supabaseClient
        .from('lead_purchases')
        .insert({
          gig_id: gigId,
          digger_id: diggerId,
          consumer_id: gigData.consumer_id,
          amount_paid: purchasePrice,
          purchase_price: purchasePrice,
          stripe_payment_id: session.payment_intent as string,
          status: 'completed',
        });

      if (insertError) {
        console.error('Error recording purchase:', insertError);
        throw insertError;
      }

      console.log('Lead purchase recorded successfully', { tier, amount: purchasePrice });
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
