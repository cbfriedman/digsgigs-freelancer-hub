import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fee rule: Gross = milestone amount. 8% platform fee paid by Digger (deducted from payout). 3% transaction fee paid by Gigger (added to charge).
const PLATFORM_FEE_PERCENT = 8; // 8% from Digger (deducted from payout); Net to Digger = gross × 0.92
const TRANSACTION_FEE_PERCENT = 3; // 3% from Gigger (added to charge); Gigger total = gross × 1.03

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-PAYMENT-CONTRACT] ${step}${s}`);
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

    const { gigId, bidId, milestones } = (await req.json()) as {
      gigId: string;
      bidId: string;
      milestones: { description: string; amount: number }[];
    };

    if (!gigId || !bidId || !milestones?.length) {
      throw new Error("Missing gigId, bidId, or milestones");
    }

    // Load gig and bid (gig.project_type for hourly contracts; bid.hourly_rate, estimated_hours)
    const { data: gig, error: gigError } = await supabaseAdmin
      .from("gigs")
      .select("id, consumer_id, awarded_digger_id, awarded_bid_id, project_type")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) throw new Error("Gig not found");
    if (gig.consumer_id !== user.id) throw new Error("Only the gig owner can create the payment contract");
    if (gig.awarded_bid_id !== bidId || !gig.awarded_digger_id) {
      throw new Error("Gig must be awarded to this bid and a digger");
    }

    const { data: bid } = await supabaseAdmin
      .from("bids")
      .select("id, amount, digger_id, pricing_model, hourly_rate, estimated_hours")
      .eq("id", bidId)
      .eq("gig_id", gigId)
      .single();

    if (!bid) throw new Error("Bid not found");
    if (bid.digger_id !== gig.awarded_digger_id) throw new Error("Bid digger does not match awarded digger");

    // For exclusive gigs: contract amount = bid - 15% deposit (milestone budget). 8% platform fee taken from deposit; digger gets full milestone amount.
    const DEPOSIT_RATE = 0.15;
    let expectedMilestoneTotal = bid.amount;
    let isExclusiveWithDeposit = false;
    if (bid.pricing_model === "success_based") {
      const { data: paidDeposit } = await supabaseAdmin
        .from("gigger_deposits")
        .select("deposit_amount_cents")
        .eq("bid_id", bidId)
        .eq("status", "paid")
        .maybeSingle();
      const depositAmount =
        paidDeposit?.deposit_amount_cents != null
          ? paidDeposit.deposit_amount_cents / 100
          : bid.amount * DEPOSIT_RATE;
      expectedMilestoneTotal = Math.max(0, bid.amount - depositAmount);
      isExclusiveWithDeposit = true; // exclusive gigs use 15% deposit; 8% platform fee from deposit, 7% to digger on first milestone
    }

    // One contract per gig: first to create wins (principle 3)
    const { data: existingContract } = await supabaseAdmin
      .from("escrow_contracts")
      .select("id")
      .eq("gig_id", gigId)
      .eq("status", "active")
      .maybeSingle();
    if (existingContract) {
      throw new Error("A payment contract already exists for this gig. You can view and use it on the gig page.");
    }

    // digger_id in gigs is digger_profiles.id (FK). bid.digger_id might be user_id or digger_profiles.id - types say bids.digger_id -> digger_profiles
    const diggerProfileId = gig.awarded_digger_id;

    const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    if (Math.abs(totalAmount - expectedMilestoneTotal) > 0.01) {
      throw new Error(
        `Milestone total ($${totalAmount.toFixed(2)}) must equal contract amount ($${expectedMilestoneTotal.toFixed(2)}${expectedMilestoneTotal !== bid.amount ? ` = bid minus 15% deposit` : ""})`
      );
    }

    for (const m of milestones) {
      if (!m.description?.trim() || (m.amount ?? 0) <= 0) {
        throw new Error("Each milestone must have a description and amount > 0");
      }
    }

    // Gigger must have at least one payment method
    // Payment method optional - gigger can approve milestones via Checkout without saving a card
    const _paymentMethodsCheck = await supabaseAdmin
      .from("payment_methods")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (false && !_paymentMethodsCheck.data?.length) {
      throw new Error("Add a payment method first (you can do it in this dialog or in Settings → Payment methods). You’re only charged when you approve each milestone.");
    }

    // Digger must have Stripe Connect set up
    let { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", diggerProfileId)
      .single();
    if (!diggerProfile?.stripe_connect_account_id) {
      throw new Error("The Digger hasn’t set up payouts yet. Ask them to complete “Get paid” / payment setup in their account (My Bids or Settings) so you can create the contract.");
    }
    if (!diggerProfile.stripe_connect_charges_enabled) {
      try {
        const { secretKey: stripeKey } = await getStripeConfig(supabaseAdmin);
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
          const account = await stripe.accounts.retrieve(diggerProfile.stripe_connect_account_id);
          const detailsSubmitted = !!account.details_submitted;
          const chargesEnabled = !!account.charges_enabled;
          const payoutsEnabled = !!account.payouts_enabled;
          const canReceivePayments = chargesEnabled || payoutsEnabled;
          await supabaseAdmin
            .from("digger_profiles")
            .update({
              stripe_connect_onboarded: detailsSubmitted,
              stripe_connect_charges_enabled: canReceivePayments,
            })
            .eq("id", diggerProfile.id);
          diggerProfile = { ...diggerProfile, stripe_connect_charges_enabled: canReceivePayments };
        }
      } catch {
        // Keep DB state as-is when Stripe API call fails.
      }
    }
    if (!diggerProfile.stripe_connect_charges_enabled) {
      throw new Error("The Digger’s payout account is still being verified. Ask them to finish the payout setup in their account; it usually takes a few minutes.");
    }

    // For exclusive: 8% platform fee from deposit at award; digger gets full milestone. For non-exclusive: 8% per milestone.
    const platformFeeAmount = isExclusiveWithDeposit ? 0 : totalAmount * (PLATFORM_FEE_PERCENT / 100);
    const platformFeePct = isExclusiveWithDeposit ? 0 : PLATFORM_FEE_PERCENT;

    const isHourlyGig = (gig as { project_type?: string }).project_type === "hourly";
    const bidHourlyRate = (bid as { hourly_rate?: number | null }).hourly_rate;
    const bidEstimatedHours = (bid as { estimated_hours?: number | null }).estimated_hours;
    const contractPayload: Record<string, unknown> = {
      gig_id: gigId,
      consumer_id: user.id,
      digger_id: diggerProfileId,
      total_amount: totalAmount,
      platform_fee_percentage: platformFeePct,
      platform_fee_amount: platformFeeAmount,
      status: "active",
      contract_type: isHourlyGig ? "hourly" : "milestone",
    };
    if (isHourlyGig && (bidHourlyRate != null || bidEstimatedHours != null)) {
      contractPayload.hourly_rate = bidHourlyRate ?? null;
      contractPayload.estimated_hours = bidEstimatedHours ?? null;
    }
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("escrow_contracts")
      .insert(contractPayload)
      .select("id")
      .single();

    if (contractError || !contract) {
      logStep("Insert contract failed", { error: contractError?.message });
      throw new Error(contractError?.message ?? "Failed to create contract");
    }

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const amount = Number(m.amount); // gross
      const platformFee = isExclusiveWithDeposit ? 0 : Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
      const diggerPayout = isExclusiveWithDeposit ? amount : Math.round((amount - platformFee) * 100) / 100;
      const { error: mpError } = await supabaseAdmin
        .from("milestone_payments")
        .insert({
          escrow_contract_id: contract.id,
          milestone_number: i + 1,
          description: m.description.trim(),
          amount,
          platform_fee: platformFee,
          digger_payout: diggerPayout,
          status: "pending",
        });

      if (mpError) {
        logStep("Insert milestone failed", { n: i + 1, error: mpError.message });
        await supabaseAdmin.from("escrow_contracts").delete().eq("id", contract.id);
        throw new Error(`Failed to create milestone ${i + 1}: ${mpError.message}`);
      }
    }

    logStep("Contract created", { contractId: contract.id, gigId, milestones: milestones.length });

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contract.id,
        message: isExclusiveWithDeposit
          ? "Payment contract created. You'll pay 3% transaction fee per milestone when you approve. The Digger receives the full milestone amount (8% platform fee was from your 15% deposit). On first milestone approval, the Digger also receives the 7% deposit advance."
          : "Payment contract created. You'll pay 3% transaction fee per milestone when you approve each one; the Digger receives the milestone amount minus 8% platform fee.",
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
