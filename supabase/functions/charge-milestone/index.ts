import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getStripeConfig } from "../_shared/stripe.ts";

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
    const { secretKey: stripeSecretKey, mode: stripeMode } = await getStripeConfig(supabaseAdmin);
    if (!stripeSecretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");
    const isLive = stripeMode === "live";

    if (useCheckoutFlow) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      const amountCents = Math.round(Number(milestone.amount) * 100);
      const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100));
      const desc = (milestone as any).description?.slice(0, 50) || "Contract milestone";

      const { data: diggerProfile } = await supabaseAdmin
        .from("digger_profiles")
        .select("stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live")
        .eq("id", contract.digger_id)
        .single();

      const connectAccountId = isLive ? (diggerProfile as any)?.stripe_connect_account_id_live : diggerProfile?.stripe_connect_account_id;
      let canReceivePayments = !!(isLive ? (diggerProfile as any)?.stripe_connect_charges_enabled_live : diggerProfile?.stripe_connect_charges_enabled);
      if (connectAccountId && !canReceivePayments) {
        try {
          const account = await stripe.accounts.retrieve(connectAccountId);
          const detailsSubmitted = !!account.details_submitted;
          const chargesEnabled = !!account.charges_enabled;
          const payoutsEnabled = !!account.payouts_enabled;
          canReceivePayments = chargesEnabled || payoutsEnabled;
          const updatePayload = isLive
            ? { stripe_connect_onboarded_live: detailsSubmitted, stripe_connect_charges_enabled_live: canReceivePayments }
            : { stripe_connect_onboarded: detailsSubmitted, stripe_connect_charges_enabled: canReceivePayments };
          await supabaseAdmin
            .from("digger_profiles")
            .update(updatePayload)
            .eq("id", contract.digger_id);
        } catch {
          // Keep DB state as-is when Stripe API call fails.
        }
      }
      if (!connectAccountId || !canReceivePayments) {
        throw new Error(
          isLive
            ? "The professional hasn't set up payouts for live payments yet. Ask them to complete \"Get paid\" while the platform is in live mode."
            : "The professional hasn't set up payouts yet. Ask them to complete \"Get paid\" in their account so you can pay via Checkout."
        );
      }

      let diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100);
      let depositAdvanceCents = 0;
      const isFirstMilestone = Number((milestone as any).milestone_number) === 1;
      if (isFirstMilestone) {
        let bidAmountForSevenPercent: number | null = null;
        const { data: depositRow } = await supabaseAdmin
          .from("gigger_deposits")
          .select("id, bid_id")
          .eq("gig_id", contract.gig_id)
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (depositRow?.bid_id) {
          const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", depositRow.bid_id).single();
          if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
        }
        if (bidAmountForSevenPercent == null) {
          const { data: gigRow } = await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
          if (gigRow?.awarded_bid_id) {
            const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
            if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
            logStep("First milestone: using awarded_bid_id for 7% (deposit row not found)", { gigId: contract.gig_id });
          }
        }
        if (bidAmountForSevenPercent != null) {
          depositAdvanceCents = Math.round(bidAmountForSevenPercent * 0.07 * 100);
          diggerPayoutCents += depositAdvanceCents;
          logStep("Adding 7% deposit advance to first milestone (Checkout)", { depositAdvanceCents, diggerPayoutCents });
        } else {
          logStep("First milestone: no bid amount for 7%", { gigId: contract.gig_id });
        }
      }
      // Gigger pays only milestone + 3% fee. 7% to digger comes from 15% deposit (transferred from platform in webhook).
      const totalChargeCents = amountCents + transactionFeeCents;
      const diggerReceivesDollars = diggerPayoutCents / 100;
      const sevenPercentDisplayDollars = (depositAdvanceCents / 100).toFixed(2);

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

      const showSevenPercentOnCheckout = depositAdvanceCents > 0;
      const milestoneAmountDollars = Number(milestone.amount).toFixed(2);
      const mainDescription = showSevenPercentOnCheckout
        ? `You pay $${(totalChargeCents / 100).toFixed(2)} (milestone + 3% fee). Professional receives: $${milestoneAmountDollars} (milestone) + $${sevenPercentDisplayDollars} (7% from your deposit) = $${diggerReceivesDollars.toFixed(2)} total.`
        : `You pay $${(totalChargeCents / 100).toFixed(2)} (milestone + 3% fee). Professional receives $${diggerReceivesDollars.toFixed(2)}.`;
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Milestone: ${desc}`,
              description: mainDescription,
            },
            unit_amount: totalChargeCents,
          },
          quantity: 1,
        },
      ];
      if (showSevenPercentOnCheckout) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `7% deposit (to professional): $${sevenPercentDisplayDollars}`,
              description: `From your 15% deposit; no extra charge. Released to the professional when you approve this first milestone.`,
            },
            unit_amount: 0,
          },
          quantity: 1,
        });
      }
      // 7% comes from platform (deposit); only milestone payout goes via destination charge.
      const transferFromThisPaymentCents = diggerPayoutCents - depositAdvanceCents;
      const session = await stripe.checkout.sessions.create({
        customer: customerId ?? undefined,
        customer_email: customerId ? undefined : giggerProfile?.email ?? undefined,
        // Connect destination charges: only card and us_bank_account (PayPal/Cash App/Link not supported for Connect unless enabled)
        payment_method_types: ["card", "us_bank_account"],
        line_items: lineItems,
        mode: "payment",
        payment_intent_data: {
          transfer_data: {
            destination: connectAccountId,
            amount: transferFromThisPaymentCents,
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

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const amountCents = Math.round(Number(milestone.amount) * 100); // gross
    const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100)); // 3% from Gigger

    // Compute digger payout and 7% deposit advance before creating PI so we can use transfer_data (destination charge).
    // Using transfer_data avoids "insufficient available funds" because the transfer happens at capture, not from platform balance.
    const { data: diggerProfileSaved } = await supabaseAdmin
      .from("digger_profiles")
      .select("stripe_connect_account_id, stripe_connect_account_id_live")
      .eq("id", contract.digger_id)
      .single();
    const connectAccountIdSaved = isLive ? (diggerProfileSaved as any)?.stripe_connect_account_id_live : diggerProfileSaved?.stripe_connect_account_id;

    let diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100); // gross - 8%
    let depositAdvanceCents = 0;
    const isFirstMilestone = Number((milestone as any).milestone_number) === 1;
    if (isFirstMilestone) {
      let bidAmountForSevenPercent: number | null = null;
      const { data: depositRow } = await supabaseAdmin
        .from("gigger_deposits")
        .select("id, bid_id")
        .eq("gig_id", contract.gig_id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (depositRow?.bid_id) {
        const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", depositRow.bid_id).single();
        if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
      }
      if (bidAmountForSevenPercent == null) {
        const { data: gigRow } = await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
        if (gigRow?.awarded_bid_id) {
          const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
          if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
          logStep("First milestone: using awarded_bid_id for 7% (deposit row not found)", { gigId: contract.gig_id });
        }
      }
      if (bidAmountForSevenPercent != null) {
        depositAdvanceCents = Math.round(bidAmountForSevenPercent * 0.07 * 100);
        diggerPayoutCents += depositAdvanceCents;
        logStep("Adding 7% deposit advance to first milestone (saved PM)", { depositAdvanceCents, diggerPayoutCents });
      }
    }
    // Gigger pays only milestone + 3% fee. 7% to digger comes from deposit (transferred from platform).
    const totalChargeCents = amountCents + transactionFeeCents;
    const transferFromThisPaymentCents = diggerPayoutCents - depositAdvanceCents;

    const idempotencyKey = `milestone-${milestonePaymentId}`;
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
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
    };
    if (connectAccountIdSaved && transferFromThisPaymentCents > 0) {
      paymentIntentParams.transfer_data = {
        destination: connectAccountIdSaved,
        amount: transferFromThisPaymentCents,
      };
      logStep("Using transfer_data (milestone payout only; 7% from platform)", { transferFromThisPaymentCents });
    }

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        paymentIntentParams,
        { idempotencyKey }
      );
    } catch (piErr: unknown) {
      const errMsg = piErr instanceof Error ? piErr.message : String(piErr);
      if (/insufficient|available balance|balance_insufficient/i.test(errMsg)) {
        logStep("PaymentIntent failed (balance/transfer); suggesting Checkout", { message: errMsg });
        return new Response(
          JSON.stringify({
            error:
              "Saved card payment couldn't be completed (platform balance limitation). Please use \"Pay with new card (Checkout)\" instead—it works reliably.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      throw piErr;
    }

    logStep("PaymentIntent created", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: totalChargeCents,
      hasTransferData: !!paymentIntentParams.transfer_data,
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

    // Milestone part sent via transfer_data. Transfer 7% from platform (deposit) to digger.
    let stripeTransferId: string | null = null;
    if (connectAccountIdSaved && depositAdvanceCents > 0) {
      try {
        const transfer = await stripe.transfers.create(
          {
            amount: depositAdvanceCents,
            currency: "usd",
            destination: connectAccountIdSaved,
            description: `Milestone 7% deposit advance - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
            metadata: {
              milestone_payment_id: milestonePaymentId,
              escrow_contract_id: milestone.escrow_contract_id,
              type: "milestone_7pct_deposit",
            },
          },
          { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
        );
        stripeTransferId = transfer.id;
        logStep("7% deposit advance transferred from platform to digger", { transferId: transfer.id });
      } catch (transferErr: unknown) {
        const err = transferErr as { message?: string; code?: string };
        logStep("7% transfer failed (platform balance); use retry-7pct-milestone later", {
          error: err?.message ?? String(transferErr),
          code: err?.code,
          milestonePaymentId,
        });
      }
    }
    await supabaseAdmin
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntent.id,
        ...(stripeTransferId && { stripe_transfer_id: stripeTransferId }),
        ...(connectAccountIdSaved && { released_at: new Date().toISOString() }),
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
    if (/insufficient|available balance|balance_insufficient/i.test(msg)) {
      return new Response(
        JSON.stringify({
          error:
            "Saved card payment couldn't be completed (platform balance limitation). Please use \"Pay with new card (Checkout)\" instead—it works reliably.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
