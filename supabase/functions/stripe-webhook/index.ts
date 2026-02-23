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

    // Stripe Connect: when a connected account completes onboarding or is updated.
    // In Stripe Dashboard → Developers → Webhooks, add event "account.updated" (and enable "Listen to events on Connected accounts" if using a separate Connect endpoint).
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      logStep('Processing account.updated (Connect)', { accountId: account.id, charges_enabled: account.charges_enabled, details_submitted: account.details_submitted });
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { error: updateError } = await supabaseClient
        .from('digger_profiles')
        .update({
          stripe_connect_onboarded: !!account.details_submitted,
          stripe_connect_charges_enabled: !!account.charges_enabled,
        })
        .eq('stripe_connect_account_id', account.id);
      if (updateError) {
        logStep('ERROR: Failed to update digger_profiles for Connect account', { error: updateError, accountId: account.id });
      } else {
        logStep('Updated digger_profiles for Connect account', { accountId: account.id });
      }
    }

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

      // Milestone payment via Checkout (no saved payment method)
      if (metadata.type === 'milestone_payment') {
        const milestonePaymentId = metadata.milestone_payment_id;
        const escrowContractId = metadata.escrow_contract_id;
        const consumerId = metadata.consumer_id;
        const diggerIdMeta = metadata.digger_id;
        const gigIdMeta = metadata.gig_id;

        if (milestonePaymentId && escrowContractId && diggerIdMeta && gigIdMeta) {
          logStep('Processing milestone payment from Checkout', { milestonePaymentId, gigId: gigIdMeta });

          const { data: milestone } = await supabaseClient
            .from('milestone_payments')
            .select('id, milestone_number, amount, digger_payout, status, stripe_payment_intent_id')
            .eq('id', milestonePaymentId)
            .single();

          if (milestone && milestone.status !== 'paid' && !milestone.stripe_payment_intent_id) {
            const paymentIntentId = session.payment_intent as string;
            // Destination charge: Stripe already sent funds to digger's Connect account via payment_intent_data.transfer_data
            await supabaseClient
              .from('milestone_payments')
              .update({
                status: 'paid',
                stripe_payment_intent_id: paymentIntentId,
                released_at: new Date().toISOString(),
              })
              .eq('id', milestonePaymentId);

            logStep('Milestone marked paid (destination charge - digger received funds at charge time)');

            let bidId = (await supabaseClient.from('gigs').select('awarded_bid_id').eq('id', gigIdMeta).single()).data?.awarded_bid_id;
            let diggerPayout = Number(milestone.digger_payout);
            let depositAdvanceCents = 0;
            if (Number(milestone.milestone_number) === 1) {
              const { data: depositRow } = await supabaseClient
                .from('gigger_deposits')
                .select('id, bid_id')
                .eq('gig_id', gigIdMeta)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (depositRow?.bid_id) {
                const { data: bidRow } = await supabaseClient.from('bids').select('amount').eq('id', depositRow.bid_id).single();
                if (bidRow?.amount != null) depositAdvanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
              }
              if (depositAdvanceCents === 0) {
                const { data: gigRow } = await supabaseClient.from('gigs').select('awarded_bid_id').eq('id', gigIdMeta).single();
                if (gigRow?.awarded_bid_id) {
                  const { data: bidRow } = await supabaseClient.from('bids').select('amount').eq('id', gigRow.awarded_bid_id).single();
                  if (bidRow?.amount != null) depositAdvanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
                }
              }
              if (depositAdvanceCents > 0) {
                diggerPayout += depositAdvanceCents / 100;
                logStep('7% deposit advance for first milestone (will transfer separately)', { depositAdvanceCents });
              }
            }
            if (!bidId) {
              const bidRow = await supabaseClient
                .from('bids')
                .select('id')
                .eq('gig_id', gigIdMeta)
                .eq('digger_id', diggerIdMeta)
                .eq('status', 'accepted')
                .limit(1)
                .maybeSingle();
              bidId = bidRow.data?.id ?? null;
            }

            const amountCents = Math.round(Number(milestone.amount) * 100);
            const transactionFeeCents = Math.round(amountCents * 0.03);
            await supabaseClient.from('transactions').insert({
              gig_id: gigIdMeta,
              bid_id: bidId ?? null,
              consumer_id: consumerId,
              digger_id: diggerIdMeta,
              total_amount: (amountCents + transactionFeeCents) / 100,
              commission_rate: 0.03,
              commission_amount: transactionFeeCents / 100,
              digger_payout: diggerPayout,
              status: 'completed',
              completed_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
              escrow_contract_id: escrowContractId,
              milestone_payment_id: milestonePaymentId,
              is_escrow: false,
            });

            if (depositAdvanceCents > 0) {
              const { data: diggerProfile } = await supabaseClient
                .from('digger_profiles')
                .select('stripe_connect_account_id')
                .eq('id', diggerIdMeta)
                .single();
              if (diggerProfile?.stripe_connect_account_id) {
                const transfer = await stripe.transfers.create(
                  {
                    amount: depositAdvanceCents,
                    currency: 'usd',
                    destination: diggerProfile.stripe_connect_account_id,
                    description: '7% deposit advance (first milestone)',
                    metadata: {
                      milestone_payment_id: milestonePaymentId,
                      escrow_contract_id: escrowContractId,
                      type: 'milestone_7pct_deposit',
                    },
                  },
                  { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
                );
                logStep('7% deposit advance transferred to digger', { transferId: transfer.id, amountCents: depositAdvanceCents });
              } else {
                logStep('Digger has no Connect account - 7% deposit advance not transferred', { diggerId: diggerIdMeta });
              }
            }

            logStep('Milestone payment completed via Checkout webhook');
          }
        } else {
          logStep('Milestone payment metadata incomplete', metadata);
        }
      } else if (purchase_type === 'keyword_bulk' && pending_purchase_id) {
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

    // Milestone payment (saved card + 3DS): PaymentIntent succeeds after client confirmCardPayment
    // If only the main webhook URL is configured in Stripe, this event comes here instead of stripe-webhook-milestone
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const metadata = pi.metadata || {};
      if (metadata.type === 'milestone') {
        const milestonePaymentId = metadata.milestone_payment_id;
        if (milestonePaymentId) {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          const { data: milestone, error: mErr } = await supabaseClient
            .from('milestone_payments')
            .select('id, milestone_number, amount, digger_payout, description, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(digger_id, gig_id, consumer_id)')
            .eq('id', milestonePaymentId)
            .single();

          if (!mErr && milestone && !(milestone as any).stripe_payment_intent_id) {
            const contract = (milestone as any).escrow_contracts;
            let diggerPayoutCents = Math.round(Number((milestone as any).digger_payout ?? milestone.amount) * 100);
            if (Number((milestone as any).milestone_number) === 1) {
              let addCents = 0;
              const { data: depositRow } = await supabaseClient
                .from('gigger_deposits')
                .select('id, bid_id')
                .eq('gig_id', contract.gig_id)
                .eq('status', 'paid')
                .order('paid_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              if (depositRow?.bid_id) {
                const { data: bidRow } = await supabaseClient.from('bids').select('amount').eq('id', depositRow.bid_id).single();
                if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
              }
              if (addCents === 0) {
                const { data: gigRow } = await supabaseClient.from('gigs').select('awarded_bid_id').eq('id', contract.gig_id).single();
                if (gigRow?.awarded_bid_id) {
                  const { data: bidRow } = await supabaseClient.from('bids').select('amount').eq('id', gigRow.awarded_bid_id).single();
                  if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
                }
              }
              if (addCents > 0) {
                diggerPayoutCents += addCents;
                logStep('Adding 7% deposit advance to first milestone (payment_intent.succeeded)', { addCents, diggerPayoutCents });
              }
            }
            const { data: diggerProfile } = await supabaseClient.from('digger_profiles').select('stripe_connect_account_id').eq('id', contract.digger_id).single();
            let stripeTransferId = null;
            if (diggerProfile?.stripe_connect_account_id) {
              const transfer = await stripe.transfers.create({
                amount: diggerPayoutCents,
                currency: 'usd',
                destination: diggerProfile.stripe_connect_account_id,
                description: `Milestone - ${(milestone as any).description?.slice(0, 50) || 'Contract milestone'}`,
                metadata: { milestone_payment_id: milestonePaymentId, escrow_contract_id: milestone.escrow_contract_id },
              });
              stripeTransferId = transfer.id;
              logStep('Milestone transfer created (PI.succeeded)', { transferId: transfer.id, amountCents: diggerPayoutCents });
            }
            await supabaseClient.from('milestone_payments').update({
              status: 'paid',
              stripe_payment_intent_id: pi.id,
              ...(stripeTransferId && { stripe_transfer_id: stripeTransferId, released_at: new Date().toISOString() }),
            }).eq('id', milestonePaymentId);
            let bidId = (await supabaseClient.from('gigs').select('awarded_bid_id').eq('id', contract.gig_id).single()).data?.awarded_bid_id;
            if (!bidId) {
              const bidRow = await supabaseClient.from('bids').select('id').eq('gig_id', contract.gig_id).eq('digger_id', contract.digger_id).eq('status', 'accepted').limit(1).maybeSingle();
              bidId = bidRow.data?.id ?? null;
            }
            const gross = Number(milestone.amount);
            const diggerPayoutDollars = diggerPayoutCents / 100;
            const giggerPaid = (pi.amount_received ?? 0) / 100;
            const transactionFeeAmount = Math.round(gross * 0.03 * 100) / 100;
            await supabaseClient.from('transactions').insert({
              gig_id: contract.gig_id,
              bid_id: bidId ?? null,
              consumer_id: contract.consumer_id,
              digger_id: contract.digger_id,
              total_amount: giggerPaid,
              commission_rate: 0.03,
              commission_amount: transactionFeeAmount,
              digger_payout: diggerPayoutDollars,
              status: 'completed',
              completed_at: new Date().toISOString(),
              stripe_payment_intent_id: pi.id,
              escrow_contract_id: milestone.escrow_contract_id,
              milestone_payment_id: milestonePaymentId,
              is_escrow: false,
            });
            logStep('Milestone payment completed via payment_intent.succeeded');
          }
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
