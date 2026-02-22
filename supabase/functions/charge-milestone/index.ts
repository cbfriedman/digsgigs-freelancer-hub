import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fee rule: Gross = milestone amount. 3% transaction fee paid by Gigger. 8% platform fee paid by Digger (deducted from payout).
const TRANSACTION_FEE_PERCENT = 3; // Gigger pays gross + 3%

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHARGE-MILESTONE] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const body = (await req.json()) as { milestonePaymentId: string; useCheckout?: boolean; origin?: string };
    const { milestonePaymentId, useCheckout, origin: originFromBody } = body;
    if (!milestonePaymentId) throw new Error("Missing milestonePaymentId");

    const { data: milestone, error: mError } = await supabaseAdmin
      .from("milestone_payments")
      .select(
        "id, milestone_number, amount, description, digger_payout, platform_fee, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(consumer_id, digger_id, gig_id)"
      )
      .eq("id", milestonePaymentId)
      .single();

    if (mError || !milestone) throw new Error("Milestone not found");
    const contract = (milestone as any).escrow_contracts;
    if (!contract || contract.consumer_id !== user.id) {
      throw new Error("Only the Gigger (client) can approve and pay this milestone");
    }
    if (milestone.status !== "submitted") {
      throw new Error(`Milestone must be submitted by the Digger first (current: ${milestone.status})`);
    }
    if ((milestone as any).stripe_payment_intent_id) {
      throw new Error("This milestone has already been paid");
    }

    const { data: defaultPm } = await supabaseAdmin
      .from("payment_methods")
      .select("stripe_payment_method_id, stripe_customer_id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .limit(1)
      .single();

    const useCheckoutFlow = useCheckout === true || !defaultPm;
    const origin = originFromBody || req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://digsandgigs.net";

    if (useCheckoutFlow) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
        apiVersion: "2023-10-16",
      });
      const amountCents = Math.round(Number(milestone.amount) * 100);
      const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100));
      const totalChargeCents = amountCents + transactionFeeCents;
      const desc = (milestone as any).description?.slice(0, 50) || "Contract milestone";

      const { data: diggerProfile } = await supabaseAdmin
        .from("digger_profiles")
        .select("stripe_connect_account_id, stripe_connect_charges_enabled")
        .eq("id", contract.digger_id)
        .single();

      if (!diggerProfile?.stripe_connect_account_id || !diggerProfile.stripe_connect_charges_enabled) {
        throw new Error("The professional hasn't set up payouts yet. Ask them to complete \"Get paid\" in their account so you can pay via Checkout.");
      }

      let diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100);
      let depositAdvanceCents = 0;
      // First milestone + paid deposit: add 7% of bid (from 15% deposit) to digger
      if ((milestone as any).milestone_number === 1) {
        const { data: gigRow } = await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
        const bidId = gigRow?.awarded_bid_id;
        if (bidId) {
          const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", bidId).single();
          const { data: depositRow } = await supabaseAdmin.from("gigger_deposits").select("id").eq("bid_id", bidId).eq("status", "paid").maybeSingle();
          if (bidRow?.amount != null && depositRow) {
            depositAdvanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
            diggerPayoutCents += depositAdvanceCents;
            logStep("Adding 7% deposit advance to first milestone", { depositAdvanceCents });
          }
        }
      }
      const diggerReceivesDollars = diggerPayoutCents / 100;

      const { data: giggerProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, stripe_customer_id")
        .eq("id", user.id)
        .single();

      let customerId = giggerProfile?.stripe_customer_id;
      if (!customerId && giggerProfile?.email) {
        const customers = await stripe.customers.list({ email: giggerProfile.email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId ?? undefined,
        customer_email: customerId ? undefined : giggerProfile?.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Milestone: ${desc}`,
                description: depositAdvanceCents > 0
                  ? `Milestone payment ($${(totalChargeCents / 100).toFixed(2)} incl. 3% fee). Professional receives $${diggerReceivesDollars.toFixed(2)} (milestone $${Number(milestone.amount).toFixed(2)} + 7% deposit advance).`
                  : `Milestone payment ($${(totalChargeCents / 100).toFixed(2)} incl. 3% fee). Professional receives $${diggerReceivesDollars.toFixed(2)}.`,
              },
              unit_amount: totalChargeCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        payment_intent_data: {
          transfer_data: {
            destination: diggerProfile.stripe_connect_account_id,
            amount: diggerPayoutCents,
          },
        },
        success_url: `${origin}/gig/${contract.gig_id}?milestone_paid=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/gig/${contract.gig_id}?milestone_cancelled=true`,
        metadata: {
          type: "milestone_payment",
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          consumer_id: contract.consumer_id,
          digger_id: contract.digger_id,
          gig_id: contract.gig_id,
        },
      });

      logStep("Checkout session created for milestone", { sessionId: session.id });
      return new Response(
        JSON.stringify({ requiresPayment: true, checkoutUrl: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const amountCents = Math.round(Number(milestone.amount) * 100); // gross
    const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100)); // 3% from Gigger
    const totalChargeCents = amountCents + transactionFeeCents; // Gigger pays gross + 3%

    const idempotencyKey = `milestone-${milestonePaymentId}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalChargeCents,
        currency: "usd",
        customer: defaultPm.stripe_customer_id,
        payment_method: defaultPm.stripe_payment_method_id,
        confirm: true,
        description: `Milestone payment - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          type: "milestone",
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          consumer_id: contract.consumer_id,
          digger_id: contract.digger_id,
          gig_id: contract.gig_id,
        },
        return_url: `${req.headers.get("origin") || ""}/my-gigs?payment=success`,
      },
      { idempotencyKey }
    );

    logStep("PaymentIntent created", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: totalChargeCents,
    });

    if (paymentIntent.status === "requires_action") {
      return new Response(
        JSON.stringify({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({
          error: "Payment did not succeed",
          status: paymentIntent.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("stripe_connect_account_id")
      .eq("id", contract.digger_id)
      .single();

    let diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100); // gross - 8%
    // First milestone + paid deposit: add 7% of bid (from deposit) to digger
    if ((milestone as any).milestone_number === 1) {
      const { data: gigRow } = await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
      const bidId = gigRow?.awarded_bid_id;
      if (bidId) {
        const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", bidId).single();
        const { data: depositRow } = await supabaseAdmin.from("gigger_deposits").select("id").eq("bid_id", bidId).eq("status", "paid").maybeSingle();
        if (bidRow?.amount != null && depositRow) {
          const advanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
          diggerPayoutCents += advanceCents;
          logStep("Adding 7% deposit advance to first milestone", { advanceCents });
        }
      }
    }
    let stripeTransferId: string | null = null;
    if (diggerProfile?.stripe_connect_account_id) {
      const transfer = await stripe.transfers.create({
        amount: diggerPayoutCents,
        currency: "usd",
        destination: diggerProfile.stripe_connect_account_id,
        description: `Milestone payment - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
        },
      });
      stripeTransferId = transfer.id;
      logStep("Transfer created", { transferId: transfer.id });
    } else {
      logStep("Digger has no Connect account - payment taken but transfer skipped", {
        milestonePaymentId,
      });
    }

    await supabaseAdmin
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntent.id,
        ...(stripeTransferId && {
          stripe_transfer_id: stripeTransferId,
          released_at: new Date().toISOString(),
        }),
      })
      .eq("id", milestonePaymentId);

    let bidId = (await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single()).data?.awarded_bid_id;
    if (!bidId) {
      const bidRow = await supabaseAdmin
        .from("bids")
        .select("id")
        .eq("gig_id", contract.gig_id)
        .eq("digger_id", contract.digger_id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      bidId = bidRow.data?.id ?? null;
    }
    await supabaseAdmin.from("transactions").insert({
      gig_id: contract.gig_id,
      bid_id: bidId ?? null,
      consumer_id: contract.consumer_id,
      digger_id: contract.digger_id,
      total_amount: totalChargeCents / 100, // what Gigger paid (gross + 3%)
      commission_rate: TRANSACTION_FEE_PERCENT / 100,
      commission_amount: transactionFeeCents / 100,
      digger_payout: diggerPayoutCents / 100, // gross - 8% (+ 7% deposit advance on first milestone)
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent.id,
      escrow_contract_id: milestone.escrow_contract_id,
      milestone_payment_id: milestonePaymentId,
      is_escrow: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment successful. The Digger will receive the payment.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
