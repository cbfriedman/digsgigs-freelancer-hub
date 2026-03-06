import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-EXPIRED-AWARDS] ${step}${detailsStr}`);
};

// Penalty for not accepting within 24h: $100 flat
const PENALTY_CENTS = 10000; // $100

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { secretKey: stripeSecretKey } = await getStripeConfig(supabaseClient);
    if (!stripeSecretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    logStep("Checking for expired awards");

    // Find deposits that are paid, past acceptance deadline, and gig still "awarded" (Digger never accepted)
    const { data: expiredDeposits, error: fetchError } = await supabaseClient
      .from("gigger_deposits")
      .select(`
        *,
        bids!inner(
          id,
          amount,
          status,
          digger_id,
          pricing_model
        ),
        gigs!inner(
          id,
          title,
          consumer_id,
          status
        ),
        digger_profiles!inner(
          id,
          user_id,
          stripe_customer_id,
          business_name
        )
      `)
      .eq("status", "paid")
      .lt("acceptance_deadline", new Date().toISOString())
      .is("refunded_at", null);

    if (fetchError) {
      throw new Error(`Failed to fetch expired deposits: ${fetchError.message}`);
    }

    if (!expiredDeposits || expiredDeposits.length === 0) {
      logStep("No expired awards found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Found ${expiredDeposits.length} expired awards to process`);

    const results = [];

    for (const deposit of expiredDeposits) {
      try {
        const gig = deposit.gigs;
        if (gig.status !== "awarded") {
          logStep("Skipping deposit - gig no longer awarded", { depositId: deposit.id, gigStatus: gig.status });
          continue;
        }

        logStep("Processing expired deposit", { depositId: deposit.id });

        const bid = deposit.bids;
        const diggerProfile = deposit.digger_profiles;

        // 1. Refund the Gigger's deposit
        if (deposit.stripe_payment_intent_id) {
          try {
            await stripe.refunds.create({
              payment_intent: deposit.stripe_payment_intent_id,
              reason: "requested_by_customer",
            });
            logStep("Gigger deposit refunded", { paymentIntentId: deposit.stripe_payment_intent_id });
          } catch (refundError) {
            logStep("Refund failed", { error: refundError instanceof Error ? refundError.message : String(refundError) });
          }
        }

        // Update deposit as refunded
        await supabaseClient
          .from("gigger_deposits")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: "digger_did_not_accept_within_24h",
          })
          .eq("id", deposit.id);

        // 2. $100 penalty for not accepting within 24h
        const feeCents = PENALTY_CENTS;

        logStep("Charging Digger penalty", { diggerId: diggerProfile.id, feeCents });

        let penaltyCollected = false;
        let chargeError: string | null = null;

        // Try to charge the Digger's card on file
        if (diggerProfile.stripe_customer_id) {
          try {
            // Get the default payment method
            const customer = await stripe.customers.retrieve(diggerProfile.stripe_customer_id) as Stripe.Customer;
            const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

            if (defaultPaymentMethod) {
              // Charge the card on file
              const paymentIntent =               await stripe.paymentIntents.create({
                amount: feeCents,
                currency: "usd",
                customer: diggerProfile.stripe_customer_id,
                payment_method: defaultPaymentMethod as string,
                off_session: true,
                confirm: true,
                description: `$100 penalty - did not accept exclusive award within 24h - ${gig.title}`,
                metadata: {
                  type: "expired_award_referral_fee",
                  deposit_id: deposit.id,
                  gig_id: gig.id,
                  bid_id: bid.id,
                  digger_id: diggerProfile.id,
                },
              });

              logStep("Digger charged successfully", { paymentIntentId: paymentIntent.id });
              penaltyCollected = true;

              // Update bid with fee info
              await supabaseClient
                .from("bids")
                .update({
                  referral_fee_cents: feeCents,
                  referral_fee_charged_at: new Date().toISOString(),
                  awarded: false,
                  awarded_at: null,
                  awarded_by: null,
                  status: "pending",
                })
                .eq("id", bid.id);
            } else {
              chargeError = "No default payment method found";
              logStep("No default payment method found for Digger", { diggerId: diggerProfile.id });
            }
          } catch (err) {
            chargeError = err instanceof Error ? err.message : String(err);
            logStep("Failed to charge Digger", { error: chargeError });
          }
        } else {
          chargeError = "No Stripe customer ID on file";
          logStep("No Stripe customer ID for Digger", { diggerId: diggerProfile.id });
        }

        // 3. FALLBACK: If penalty collection failed, create pending payment record and flag account
        if (!penaltyCollected) {
          logStep("Creating pending penalty payment record", { diggerId: diggerProfile.id, feeCents });

          // Create pending penalty payment record
          await supabaseClient
            .from("pending_penalty_payments")
            .insert({
              digger_id: diggerProfile.id,
              deposit_id: deposit.id,
              gig_id: gig.id,
              bid_id: bid.id,
              amount_cents: feeCents,
              reason: "non_acceptance_penalty",
              status: "pending",
              collection_attempts: 1,
              last_attempt_at: new Date().toISOString(),
              notes: `Initial collection failed: ${chargeError}`,
            });

          // Flag the Digger's account
          await supabaseClient
            .from("digger_profiles")
            .update({
              has_outstanding_penalty: true,
            })
            .eq("id", diggerProfile.id);

          // Update bid status to reflect pending penalty
          await supabaseClient
            .from("bids")
            .update({
              referral_fee_cents: feeCents,
              awarded: false,
              awarded_at: null,
              awarded_by: null,
              status: "pending",
            })
            .eq("id", bid.id);

          logStep("Account flagged with outstanding penalty", { diggerId: diggerProfile.id });
        }

        // 4. Update gig status back to open
        await supabaseClient
          .from("gigs")
          .update({
            status: "open",
            awarded_at: null,
            awarded_digger_id: null,
            awarded_bid_id: null,
          })
          .eq("id", gig.id);

        // 5. Update bid (if not already updated above)
        await supabaseClient
          .from("bids")
          .update({
            awarded: false,
            awarded_at: null,
            awarded_by: null,
            status: "pending",
          })
          .eq("id", bid.id);

        // 6. Notify the Gigger about the refund
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: gig.consumer_id,
            type: "award_expired_refund",
            title: "Award Expired - Deposit Refunded",
            message: `The professional did not accept your exclusive award for "${gig.title}" within 24 hours. Your deposit has been refunded.`,
            link: `/gig/${gig.id}`,
            metadata: {
              gig_id: gig.id,
              deposit_id: deposit.id,
              refund_amount_cents: deposit.deposit_amount_cents,
            },
          });

        // 7. Notify the Digger about the fee (with different message based on collection status)
        const diggerMessage = penaltyCollected
          ? `You did not accept the exclusive award for "${gig.title}" within 24 hours. A penalty of $${(feeCents / 100).toFixed(0)} has been charged.`
          : `You did not accept the exclusive award for "${gig.title}" within 24 hours. A penalty of $${(feeCents / 100).toFixed(0)} is outstanding. Please update your payment method to settle this balance.`;

        await supabaseClient
          .from("notifications")
          .insert({
            user_id: diggerProfile.user_id,
            type: penaltyCollected ? "award_expired_fee" : "award_expired_fee_pending",
            title: penaltyCollected ? "Exclusive Award Expired - Penalty Charged" : "Exclusive Award Expired - Penalty Outstanding",
            message: diggerMessage,
            link: penaltyCollected ? `/gig/${gig.id}` : "/settings/billing",
            metadata: {
              gig_id: gig.id,
              deposit_id: deposit.id,
              fee_cents: feeCents,
              penalty_collected: penaltyCollected,
            },
          });

        results.push({ 
          depositId: deposit.id, 
          success: true, 
          penaltyCollected,
          penaltyAmount: feeCents,
        });
      } catch (error) {
        logStep("Failed to process deposit", { 
          depositId: deposit.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
        results.push({ depositId: deposit.id, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    logStep("Processing complete", { results });

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
