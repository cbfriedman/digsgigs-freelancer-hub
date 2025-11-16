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
    console.error('Webhook error: Missing stripe-signature header');
    return new Response(
      JSON.stringify({ error: 'No signature' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // SECURITY: Make webhook secret mandatory
    if (!webhookSecret) {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not configured');
      throw new Error('Webhook secret is not configured. Contact administrator.');
    }

    if (!stripeSecretKey) {
      console.error('CRITICAL: STRIPE_SECRET_KEY is not configured');
      throw new Error('Stripe configuration error');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();

    // SECURITY: Always validate webhook signatures
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook signature validated successfully');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('Webhook event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a withdrawal penalty payment
      const { penalty_id, bid_id, digger_id } = session.metadata || {};
      
      if (penalty_id && bid_id && digger_id) {
        // This is a withdrawal penalty payment
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Update penalty status
        const { error: updatePenaltyError } = await supabaseClient
          .from('withdrawal_penalties')
          .update({
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string,
            paid_at: new Date().toISOString()
          })
          .eq('id', penalty_id);

        if (updatePenaltyError) {
          console.error('Error updating penalty:', updatePenaltyError);
          throw updatePenaltyError;
        }

        // Get penalty amount
        const { data: penaltyData } = await supabaseClient
          .from('withdrawal_penalties')
          .select('penalty_amount')
          .eq('id', penalty_id)
          .single();

        // Update bid status to withdrawn
        const { error: updateBidError } = await supabaseClient
          .from('bids')
          .update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString(),
            withdrawal_penalty: penaltyData?.penalty_amount
          })
          .eq('id', bid_id);

        if (updateBidError) {
          console.error('Error updating bid:', updateBidError);
          throw updateBidError;
        }

        // Update gig status back to open
        const { data: bidData } = await supabaseClient
          .from('bids')
          .select('gig_id')
          .eq('id', bid_id)
          .single();

        if (bidData) {
          await supabaseClient
            .from('gigs')
            .update({ status: 'open' })
            .eq('id', bidData.gig_id);
        }

        console.log('Withdrawal penalty processed successfully', { penalty_id, bid_id, digger_id });
      } else {
        // This is a regular lead purchase
        const { gigId, diggerId, amount, tier } = session.metadata || {};

        if (!gigId || !diggerId || !amount) {
          throw new Error('Missing metadata in session');
        }

        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get the consumer_id for this gig
        const { data: gigData, error: gigError } = await supabaseClient
          .from('gigs')
          .select('consumer_id')
          .eq('id', gigId)
          .single();

        if (gigError || !gigData) {
          console.error('Error fetching gig:', gigError);
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

        console.log('Lead purchase recorded successfully', { tier, amount: purchasePrice, gigId, diggerId });
      }
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
