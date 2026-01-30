import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-EXPIRED-AWARDS] ${step}${detailsStr}`);
};

// Referral fee configuration for non-acceptance penalty
const REFERRAL_FEE_RATE = 0.08; // 8%
const REFERRAL_FEE_MIN_CENTS = 10000; // $100 minimum
const REFERRAL_FEE_MAX_CENTS = 50000; // $500 maximum

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

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    logStep("Checking for expired awards");

    // Find deposits that are paid but past their acceptance deadline
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
          consumer_id
        ),
        digger_profiles!inner(
          id,
          user_id,
          stripe_customer_id
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
        logStep("Processing expired deposit", { depositId: deposit.id });

        const bid = deposit.bids;
        const gig = deposit.gigs;
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

        // 2. Charge the Digger the referral fee (8%, min $100, max $500)
        const bidAmountCents = Math.round(bid.amount * 100);
        const calculatedFee = Math.round(bidAmountCents * REFERRAL_FEE_RATE);
        const feeCents = Math.max(REFERRAL_FEE_MIN_CENTS, Math.min(calculatedFee, REFERRAL_FEE_MAX_CENTS));

        logStep("Charging Digger referral fee", { 
          diggerId: diggerProfile.id, 
          calculatedFee,
          feeCents,
          appliedMin: calculatedFee < REFERRAL_FEE_MIN_CENTS,
          appliedMax: calculatedFee > REFERRAL_FEE_MAX_CENTS
        });

        // Try to charge the Digger's card on file
        if (diggerProfile.stripe_customer_id) {
          try {
            // Get the default payment method
            const customer = await stripe.customers.retrieve(diggerProfile.stripe_customer_id) as Stripe.Customer;
            const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

            if (defaultPaymentMethod) {
              // Charge the card on file
              const paymentIntent = await stripe.paymentIntents.create({
                amount: feeCents,
                currency: "usd",
                customer: diggerProfile.stripe_customer_id,
                payment_method: defaultPaymentMethod as string,
                off_session: true,
                confirm: true,
                description: `Referral fee for expired exclusive award - ${gig.title}`,
                metadata: {
                  type: "expired_award_referral_fee",
                  deposit_id: deposit.id,
                  gig_id: gig.id,
                  bid_id: bid.id,
                  digger_id: diggerProfile.id,
                },
              });

              logStep("Digger charged successfully", { paymentIntentId: paymentIntent.id });

              // Update bid with fee info
              await supabaseClient
                .from("bids")
                .update({
                  referral_fee_cents: feeCents,
                  referral_fee_charged_at: new Date().toISOString(),
                  status: "expired",
                })
                .eq("id", bid.id);
            } else {
              logStep("No default payment method found for Digger", { diggerId: diggerProfile.id });
            }
          } catch (chargeError) {
            logStep("Failed to charge Digger", { 
              error: chargeError instanceof Error ? chargeError.message : String(chargeError) 
            });
          }
        }

        // 3. Update gig status back to open
        await supabaseClient
          .from("gigs")
          .update({
            status: "open",
            awarded_at: null,
            awarded_digger_id: null,
            awarded_bid_id: null,
          })
          .eq("id", gig.id);

        // 4. Update bid status
        await supabaseClient
          .from("bids")
          .update({
            awarded: false,
            status: "expired",
          })
          .eq("id", bid.id);

        // 5. Notify the Gigger about the refund
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

        // 6. Notify the Digger about the fee
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: diggerProfile.user_id,
            type: "award_expired_fee",
            title: "Exclusive Award Expired",
            message: `You did not accept the exclusive award for "${gig.title}" within 24 hours. A referral fee of $${(feeCents / 100).toFixed(0)} has been charged.`,
            link: `/gig/${gig.id}`,
            metadata: {
              gig_id: gig.id,
              deposit_id: deposit.id,
              fee_cents: feeCents,
            },
          });

        results.push({ depositId: deposit.id, success: true });
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
