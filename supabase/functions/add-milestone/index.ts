import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_PERCENT = 8;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADD-MILESTONE] ${step}${s}`);
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

    const { gigId, description, amount } = (await req.json()) as {
      gigId: string;
      description: string;
      amount: number;
    };

    if (!gigId || !description?.trim()) {
      throw new Error("Missing gigId or description");
    }
    const numAmount = Number(amount);
    if (numAmount <= 0 || !Number.isFinite(numAmount)) {
      throw new Error("Amount must be a positive number");
    }

    // Load contract: must exist, active, and caller must be the consumer (gigger)
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("escrow_contracts")
      .select("id, gig_id, consumer_id, digger_id, total_amount, platform_fee_amount, platform_fee_percentage")
      .eq("gig_id", gigId)
      .eq("status", "active")
      .single();

    if (contractError || !contract) {
      throw new Error("Active contract not found for this gig");
    }
    if (contract.consumer_id !== user.id) {
      throw new Error("Only the client (gigger) can add milestones to this contract");
    }

    // Next milestone number
    const { data: existing } = await supabaseAdmin
      .from("milestone_payments")
      .select("milestone_number")
      .eq("escrow_contract_id", contract.id)
      .order("milestone_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = (existing?.milestone_number ?? 0) + 1;

    // Fee logic: same as create-payment-contract. For success_based with deposit, digger gets full amount.
    let isExclusiveWithDeposit = false;
    const { data: gig } = await supabaseAdmin
      .from("gigs")
      .select("awarded_bid_id")
      .eq("id", contract.gig_id)
      .single();
    if (gig?.awarded_bid_id) {
      const { data: bid } = await supabaseAdmin
        .from("bids")
        .select("pricing_model")
        .eq("id", gig.awarded_bid_id)
        .single();
      if (bid?.pricing_model === "success_based") {
        const { data: deposit } = await supabaseAdmin
          .from("gigger_deposits")
          .select("id")
          .eq("bid_id", gig.awarded_bid_id)
          .eq("status", "paid")
          .maybeSingle();
        isExclusiveWithDeposit = !!deposit;
      }
    }

    const platformFee = isExclusiveWithDeposit
      ? 0
      : Math.round(numAmount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const diggerPayout = isExclusiveWithDeposit ? numAmount : Math.round((numAmount - platformFee) * 100) / 100;

    // Insert new milestone
    const { error: insertError } = await supabaseAdmin.from("milestone_payments").insert({
      escrow_contract_id: contract.id,
      milestone_number: nextNumber,
      description: description.trim(),
      amount: numAmount,
      platform_fee: platformFee,
      digger_payout: diggerPayout,
      status: "pending",
    });

    if (insertError) {
      logStep("Insert milestone failed", { error: insertError.message });
      throw new Error(insertError.message ?? "Failed to add milestone");
    }

    // Update contract totals
    const newTotalAmount = Number(contract.total_amount) + numAmount;
    const newPlatformFeeAmount = Number(contract.platform_fee_amount) + platformFee;
    const { error: updateError } = await supabaseAdmin
      .from("escrow_contracts")
      .update({
        total_amount: newTotalAmount,
        platform_fee_amount: newPlatformFeeAmount,
      })
      .eq("id", contract.id);

    if (updateError) {
      logStep("Update contract failed", { error: updateError.message });
      throw new Error(updateError.message ?? "Failed to update contract");
    }

    logStep("Milestone added", { contractId: contract.id, milestoneNumber: nextNumber, amount: numAmount });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Milestone added. The professional can submit it when the work is done; you'll pay when you approve.",
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
