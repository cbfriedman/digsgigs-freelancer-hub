import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANSACTION_FEE_PERCENT = 3;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAYPAL-PAYOUT] ${step}${s}`);
};

/** Get PayPal OAuth2 access token. */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") ?? Deno.env.get("PAYPAL_CLIENT_ID_LIVE");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? Deno.env.get("PAYPAL_CLIENT_SECRET_LIVE");
  const baseUrl = Deno.env.get("PAYPAL_SANDBOX") === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  if (!clientId || !secret) {
    throw new Error("PayPal not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (or _LIVE) in Edge Function secrets.");
  }
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    logStep("PayPal OAuth failed", { status: res.status, body: text });
    throw new Error(`PayPal auth failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in PayPal response");
  return data.access_token;
}

/** Create a single-recipient payout via PayPal Payouts API. */
async function createPayPalPayout(
  accessToken: string,
  recipientEmail: string,
  amountDollars: number,
  currency: string,
  idempotencyId: string,
  note?: string
): Promise<{ batch_id?: string; error?: string }> {
  const baseUrl = Deno.env.get("PAYPAL_SANDBOX") === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  const value = amountDollars.toFixed(2);
  const body = {
    sender_batch_header: {
      sender_batch_id: idempotencyId,
      email_subject: "You have a payout from Digs & Gigs",
      email_message: note ?? "Your milestone payout from Digs & Gigs.",
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: { value, currency },
        receiver: recipientEmail,
        note: note ?? "Milestone payout",
      },
    ],
  };
  const res = await fetch(`${baseUrl}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": idempotencyId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { batch_header?: { payout_batch_id?: string }; message?: string; name?: string };
  if (!res.ok) {
    logStep("PayPal payout failed", { status: res.status, data });
    return { error: data.message ?? data.name ?? `PayPal ${res.status}` };
  }
  return { batch_id: data.batch_header?.payout_batch_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceRole || authHeader.replace("Bearer ", "") !== serviceRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Use service role to invoke this function." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body = (await req.json()) as { milestonePaymentId: string; stripePaymentIntentId?: string };
    const { milestonePaymentId, stripePaymentIntentId } = body;
    if (!milestonePaymentId) {
      return new Response(
        JSON.stringify({ error: "Missing milestonePaymentId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRole,
      { auth: { persistSession: false } }
    );

    const { data: milestone, error: mErr } = await supabase
      .from("milestone_payments")
      .select("id, milestone_number, amount, digger_payout, description, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(digger_id, gig_id, consumer_id)")
      .eq("id", milestonePaymentId)
      .single();

    if (mErr || !milestone) {
      return new Response(
        JSON.stringify({ error: "Milestone not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (milestone.status === "paid" && milestone.stripe_payment_intent_id) {
      logStep("Already paid (idempotent)", { milestonePaymentId });
      return new Response(
        JSON.stringify({ success: true, alreadyCompleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contract = (milestone as { escrow_contracts: { digger_id: string; gig_id: string; consumer_id: string } }).escrow_contracts;
    const { data: diggerProfile } = await supabase
      .from("digger_profiles")
      .select("payout_provider, payout_email")
      .eq("id", contract.digger_id)
      .single();

    if (diggerProfile?.payout_provider !== "paypal" || !diggerProfile?.payout_email?.trim()) {
      return new Response(
        JSON.stringify({ error: "Digger is not set up for PayPal payouts or payout email is missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let diggerPayoutDollars = Number(milestone.digger_payout ?? milestone.amount);
    if (Number(milestone.milestone_number) === 1) {
      const { data: depositRow } = await supabase
        .from("gigger_deposits")
        .select("bid_id")
        .eq("gig_id", contract.gig_id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let addCents = 0;
      if (depositRow?.bid_id) {
        const { data: bidRow } = await supabase.from("bids").select("amount").eq("id", depositRow.bid_id).single();
        if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
      }
      if (addCents === 0) {
        const { data: gigRow } = await supabase.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
        if (gigRow?.awarded_bid_id) {
          const { data: bidRow } = await supabase.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
          if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
        }
      }
      if (addCents > 0) diggerPayoutDollars += addCents / 100;
    }

    const accessToken = await getPayPalAccessToken();
    const idempotencyId = `milestone-${milestonePaymentId}`;
    const result = await createPayPalPayout(
      accessToken,
      diggerProfile.payout_email.trim(),
      diggerPayoutDollars,
      "USD",
      idempotencyId,
      (milestone as { description?: string }).description ?? "Milestone payout"
    );

    if (result.error) {
      logStep("PayPal payout error", { error: result.error });
      return new Response(
        JSON.stringify({ error: result.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    const paymentIntentId = stripePaymentIntentId ?? (milestone as { stripe_payment_intent_id?: string }).stripe_payment_intent_id;
    await supabase
      .from("milestone_payments")
      .update({
        status: "paid",
        ...(paymentIntentId && { stripe_payment_intent_id: paymentIntentId }),
        released_at: new Date().toISOString(),
      })
      .eq("id", milestonePaymentId);

    let bidId = (await supabase.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single()).data?.awarded_bid_id;
    if (!bidId) {
      const bidRow = await supabase
        .from("bids")
        .select("id")
        .eq("gig_id", contract.gig_id)
        .eq("digger_id", contract.digger_id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      bidId = bidRow.data?.id ?? null;
    }

    const gross = Number(milestone.amount);
    const transactionFeeAmount = Math.round(gross * 0.03 * 100) / 100;
    const totalChargeCents = Math.round(gross * 100) + Math.round(gross * 0.03 * 100);
    await supabase.from("transactions").insert({
      gig_id: contract.gig_id,
      bid_id: bidId,
      consumer_id: contract.consumer_id,
      digger_id: contract.digger_id,
      total_amount: totalChargeCents / 100,
      commission_rate: TRANSACTION_FEE_PERCENT / 100,
      commission_amount: transactionFeeAmount,
      digger_payout: diggerPayoutDollars,
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(paymentIntentId && { stripe_payment_intent_id: paymentIntentId }),
      escrow_contract_id: milestone.escrow_contract_id,
      milestone_payment_id: milestonePaymentId,
      is_escrow: false,
    });

    logStep("PayPal payout completed", { milestonePaymentId, batch_id: result.batch_id });
    return new Response(
      JSON.stringify({ success: true, batch_id: result.batch_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
