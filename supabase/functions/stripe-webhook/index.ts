import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    logStep('ERROR: Missing stripe-signature header');
    return new Response(
      JSON.stringify({ error: 'No signature' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    logStep('Environment check', { 
      hasStripeKey: !!stripeSecretKey, 
      hasWebhookSecret: !!webhookSecret,
      webhookSecretPrefix: webhookSecret?.substring(0, 10) 
    });

    if (!webhookSecret) {
      logStep('CRITICAL: STRIPE_WEBHOOK_SECRET is not configured');
      throw new Error('Webhook secret is not configured. Contact administrator.');
    }

    if (!stripeSecretKey) {
      logStep('CRITICAL: STRIPE_SECRET_KEY is not configured');
      throw new Error('Stripe configuration error');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();

    // Use constructEventAsync with crypto provider for Deno compatibility
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider
      );
      logStep('Webhook signature validated successfully', { eventType: event.type });
    } catch (err) {
      logStep('ERROR: Webhook signature verification failed', { 
        error: err instanceof Error ? err.message : String(err),
        signaturePrefix: signature?.substring(0, 20)
      });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    logStep('Webhook event received', { type: event.type });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      
      logStep('Processing checkout.session.completed', { sessionId: session.id, metadata });

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check purchase type
      const { purchase_type, penalty_id, bid_id, digger_id, pending_purchase_id } = metadata;

      if (purchase_type === 'keyword_bulk' && pending_purchase_id) {
        // Handle bulk lead credit purchase
        logStep('Processing keyword_bulk purchase', { pendingPurchaseId: pending_purchase_id });

        // Fetch pending purchase with selections
        const { data: pendingPurchase, error: fetchError } = await supabaseClient
          .from('pending_lead_purchases')
          .select('*')
          .eq('id', pending_purchase_id)
          .single();

        if (fetchError || !pendingPurchase) {
          logStep('ERROR: Pending purchase not found', { error: fetchError, pendingPurchaseId: pending_purchase_id });
          throw new Error('Pending purchase not found');
        }

        logStep('Pending purchase found', { 
          userId: pendingPurchase.user_id, 
          selectionsCount: pendingPurchase.selections?.length,
          finalAmount: pendingPurchase.final_amount
        });

        const selections = pendingPurchase.selections;
        if (!selections || !Array.isArray(selections) || selections.length === 0) {
          throw new Error('No selections found in pending purchase');
        }

        // Calculate discounted price per lead
        const totalQuantity = selections.reduce((sum: number, s: any) => sum + s.quantity, 0);
        const discountedPricePerLead = pendingPurchase.final_amount / totalQuantity;

        // Create lead credits for each selection
        const leadCredits = selections.map((selection: any) => ({
          user_id: pendingPurchase.user_id,
          digger_profile_id: pendingPurchase.digger_profile_id,
          keyword: selection.keyword,
          industry: selection.industry || null,
          exclusivity_type: selection.exclusivity === 'exclusive-24h' ? 'exclusive' : 
                           selection.exclusivity === 'semi-exclusive' ? 'semi-exclusive' : 'non-exclusive',
          quantity_purchased: selection.quantity,
          quantity_remaining: selection.quantity,
          price_per_lead: discountedPricePerLead,
          total_paid: discountedPricePerLead * selection.quantity,
          stripe_payment_id: session.payment_intent as string,
          stripe_session_id: session.id,
        }));

        logStep('Creating lead credits', { count: leadCredits.length });

        const { data: insertedCredits, error: insertError } = await supabaseClient
          .from('lead_credits')
          .insert(leadCredits)
          .select();

        if (insertError) {
          logStep('ERROR: Failed to insert lead credits', { error: insertError });
          throw insertError;
        }

        logStep('Lead credits created successfully', { count: insertedCredits?.length });

        // Update pending purchase status
        await supabaseClient
          .from('pending_lead_purchases')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', pending_purchase_id);

        logStep('Pending purchase marked as completed');

      } else if (penalty_id && bid_id && digger_id) {
        // Handle withdrawal penalty payment
        logStep('Processing withdrawal penalty payment', { penaltyId: penalty_id, bidId: bid_id });

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
          logStep('ERROR: Failed to update penalty', { error: updatePenaltyError });
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
          logStep('ERROR: Failed to update bid', { error: updateBidError });
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

        logStep('Withdrawal penalty processed successfully');

      } else {
        // Regular lead purchase (legacy flow)
        const { gigId, diggerId, amount, tier } = metadata;

        if (gigId && diggerId && amount) {
          logStep('Processing regular lead purchase', { gigId, diggerId, amount });

          // Get the consumer_id for this gig
          const { data: gigData, error: gigError } = await supabaseClient
            .from('gigs')
            .select('consumer_id')
            .eq('id', gigId)
            .single();

          if (gigError || !gigData) {
            logStep('ERROR: Gig not found', { error: gigError });
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
            logStep('ERROR: Failed to record lead purchase', { error: insertError });
            throw insertError;
          }

          logStep('Lead purchase recorded successfully', { tier, amount: purchasePrice });
        } else {
          logStep('Unhandled checkout session - no matching purchase type', { metadata });
        }
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
    logStep('ERROR', { error: error instanceof Error ? error.message : error });
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
