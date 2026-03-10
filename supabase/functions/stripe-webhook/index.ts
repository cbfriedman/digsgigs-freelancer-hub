import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { verifyWebhookAndGetStripeContextAsync } from "../_shared/stripe.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const body = await req.text();
    const ctx = await verifyWebhookAndGetStripeContextAsync(body, signature, "STRIPE_WEBHOOK_SECRET");
    if (!ctx) {
      logStep('ERROR: Webhook signature verification failed (no matching test/live secret)');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      );
    }
    const { event, secretKey } = ctx;
    logStep('Webhook signature validated successfully', { eventType: event.type, mode: ctx.mode });

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    logStep('Webhook event received', { type: event.type });

    // Stripe Connect: when a connected account completes onboarding or is updated.
    // In Stripe Dashboard → Developers → Webhooks, add event "account.updated" (and enable "Listen to events on Connected accounts" if using a separate Connect endpoint).
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      logStep('Processing account.updated (Connect)', {
        accountId: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      });
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const onboarded = !!account.details_submitted;
      const chargesEnabled = !!account.charges_enabled;
      const payoutsEnabled = !!account.payouts_enabled;
      // In test/sandbox, Stripe can keep charges_enabled false briefly after onboarding; treat details_submitted as ready.
      const isTestMode = ctx.mode === 'test';
      const canReceivePayments = chargesEnabled || payoutsEnabled || (isTestMode && !!account.details_submitted);
      const { error: updateTest } = await supabaseClient
        .from('digger_profiles')
        .update({ stripe_connect_onboarded: onboarded, stripe_connect_charges_enabled: canReceivePayments })
        .eq('stripe_connect_account_id', account.id);
      const { error: updateLive } = await supabaseClient
        .from('digger_profiles')
        .update({ stripe_connect_onboarded_live: onboarded, stripe_connect_charges_enabled_live: canReceivePayments })
        .eq('stripe_connect_account_id_live', account.id);
      if (updateTest && updateLive) {
        logStep('ERROR: Failed to update digger_profiles for Connect account', { error: updateTest?.message ?? updateLive?.message, accountId: account.id });
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
            // Verify where the payment went (destination charge)
            try {
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
              const dest = (pi as any).transfer_data?.destination;
              const transferAmt = (pi as any).transfer_data?.amount;
              const status = pi.status;
              logStep('PaymentIntent verified', {
                status,
                transfer_destination: dest ? String(dest).slice(0, 12) + '...' : null,
                transfer_amount_cents: transferAmt ?? null,
              });
              if (status !== 'succeeded') {
                logStep('WARNING: PaymentIntent not succeeded - digger may not have received funds', { status, paymentIntentId: paymentIntentId.slice(0, 20) + '...' });
              }
            } catch (e) {
              logStep('Could not verify PaymentIntent (non-blocking)', { error: e instanceof Error ? e.message : String(e) });
            }
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
                logStep('7% deposit advance for first milestone (will transfer from platform)', { depositAdvanceCents });
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
                try {
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
                } catch (e) {
                  logStep('7% transfer failed (platform balance); retry with retry-7pct-milestone', { error: e instanceof Error ? e.message : String(e) });
                }
              }
            }

            // Verify where funds went and warn if Digger must complete onboarding to receive payout
            const connectAccountAutoCreated = metadata.connect_account_auto_created === 'true';
            let connectAccountIdForCheck: string | null = null;
            if (connectAccountAutoCreated) {
              const { data: dp } = await supabaseClient.from('digger_profiles').select('stripe_connect_account_id').eq('id', diggerIdMeta).maybeSingle();
              connectAccountIdForCheck = (dp as any)?.stripe_connect_account_id ?? null;
            } else {
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
              connectAccountIdForCheck = (pi.transfer_data?.destination as string) ?? null;
            }
            if (connectAccountIdForCheck) {
              try {
                const account = await stripe.accounts.retrieve(connectAccountIdForCheck);
                const onboarded = !!account.details_submitted;
                if (!onboarded || connectAccountAutoCreated) {
                  logStep('DIGGER_PAYOUT_SETUP_REQUIRED: Funds were sent to the professional\'s Connect account. They must complete Get paid (Reconnect payout account) and add their bank details to receive the money in their bank. Until then, funds remain in their Stripe Connect balance.', {
                    connectAccountId: connectAccountIdForCheck.slice(0, 12) + '...',
                    details_submitted: onboarded,
                    connect_account_auto_created: connectAccountAutoCreated,
                  });
                }
              } catch (e) {
                logStep('Could not verify Connect account (non-blocking)', { error: e instanceof Error ? e.message : String(e) });
              }
            }

            logStep('Milestone payment completed via Checkout webhook');
          }
        } else {
          logStep('Milestone payment metadata incomplete', metadata);
        }
      } else if (metadata.type === 'lead_unlock') {
        // Lead unlock from create-lead-unlock-checkout (Unlock lead button on gig page)
        const leadId = metadata.leadId;
        const diggerIdUnlock = metadata.diggerId;
        const userId = metadata.userId;
        const priceCents = parseInt(metadata.priceCents || '0', 10);
        logStep('Processing lead_unlock', { leadId, diggerId: diggerIdUnlock });

        const { error: unlockError } = await supabaseClient
          .from('lead_unlocks')
          .insert({
            lead_id: leadId,
            digger_id: diggerIdUnlock,
            user_id: userId,
            price_paid_cents: priceCents,
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_checkout_session_id: session.id,
            unlocked_at: new Date().toISOString(),
          });
        if (unlockError) {
          if (unlockError.code === '23505') {
            logStep('Lead already unlocked (duplicate)');
          } else {
            logStep('ERROR creating lead_unlock', { error: unlockError });
            throw unlockError;
          }
        } else {
          logStep('Lead unlock created');
        }

        const priceDollars = Math.round(priceCents) / 100;
        const { data: gigRow } = await supabaseClient
          .from('gigs')
          .select('consumer_id, purchase_count')
          .eq('id', leadId)
          .single();
        if (gigRow?.consumer_id) {
          const { error: purchaseErr } = await supabaseClient
            .from('lead_purchases')
            .insert({
              digger_id: diggerIdUnlock,
              gig_id: leadId,
              consumer_id: gigRow.consumer_id,
              purchase_price: priceDollars,
              amount_paid: priceDollars,
              status: 'completed',
              stripe_payment_id: session.payment_intent as string,
            });
          if (purchaseErr) {
            if (purchaseErr.code === '23505') logStep('lead_purchase already exists');
            else {
              logStep('ERROR creating lead_purchase', { error: purchaseErr });
            }
          } else {
            logStep('lead_purchase created for contact access');
          }
        }
        if (gigRow) {
          await supabaseClient
            .from('gigs')
            .update({ purchase_count: (gigRow.purchase_count || 0) + 1 })
            .eq('id', leadId);
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
            .update({
              status: 'open',
              awarded_bid_id: null,
              awarded_digger_id: null,
            })
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
            const alreadyTransferredCents = (pi.transfer_data?.amount ?? 0) || 0;
            const remainderCents = diggerPayoutCents - alreadyTransferredCents;
            let stripeTransferId = null;
            if (diggerProfile?.stripe_connect_account_id && remainderCents > 0) {
              try {
                const transfer = await stripe.transfers.create(
                  {
                    amount: remainderCents,
                    currency: 'usd',
                    destination: diggerProfile.stripe_connect_account_id,
                    description: Number((milestone as any).milestone_number) === 1
                      ? '7% deposit advance (first milestone)'
                      : `Milestone - ${(milestone as any).description?.slice(0, 50) || 'Contract milestone'}`,
                    metadata: { milestone_payment_id: milestonePaymentId, escrow_contract_id: milestone.escrow_contract_id, type: 'milestone_7pct_deposit' },
                  },
                  { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
                );
                stripeTransferId = transfer.id;
                logStep('7% deposit advance (remainder) transferred to digger', { transferId: transfer.id, remainderCents, alreadyTransferredCents });
              } catch (transferErr: unknown) {
                const err = transferErr as { message?: string; code?: string; type?: string };
                logStep('Milestone 7% transfer failed (platform balance may be unavailable; retry with same idempotency key)', {
                  error: err?.message ?? String(transferErr),
                  code: err?.code,
                  remainderCents,
                  milestonePaymentId,
                });
              }
            }
            await supabaseClient.from('milestone_payments').update({
              status: 'paid',
              stripe_payment_intent_id: pi.id,
              ...(stripeTransferId && { stripe_transfer_id: stripeTransferId }),
              ...(diggerProfile?.stripe_connect_account_id && { released_at: new Date().toISOString() }),
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
