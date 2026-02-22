import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEPOSIT_RATE = 0.15;

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

    // Resolve current user's digger_profiles.id (Digger can only suggest for their own bid)
    const { data: diggerProfile, error: dpError } = await supabaseAdmin
      .from("digger_profiles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (dpError || !diggerProfile) {
      throw new Error("Only the awarded Digger can suggest a milestone plan. Complete your Digger profile first.");
    }

    const { data: gig, error: gigError } = await supabaseAdmin
      .from("gigs")
      .select("id, consumer_id, awarded_digger_id, awarded_bid_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) throw new Error("Gig not found");
    if (gig.awarded_bid_id !== bidId || gig.awarded_digger_id !== diggerProfile.id) {
      throw new Error("This bid is not your awarded bid for this gig.");
    }

    const { data: bid } = await supabaseAdmin
      .from("bids")
      .select("id, amount, digger_id, pricing_model")
      .eq("id", bidId)
      .eq("gig_id", gigId)
      .single();

    if (!bid || bid.digger_id !== diggerProfile.id) throw new Error("Bid not found or not yours");

    // No contract must exist yet (only suggest before contract is created)
    const { data: existingContract } = await supabaseAdmin
      .from("escrow_contracts")
      .select("id")
      .eq("gig_id", gigId)
      .in("status", ["active", "completed"])
      .maybeSingle();
    if (existingContract) {
      throw new Error("A payment contract already exists. You cannot change the suggested plan.");
    }

    let expectedMilestoneTotal = bid.amount;
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
    }

    const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    if (Math.abs(totalAmount - expectedMilestoneTotal) > 0.01) {
      throw new Error(
        `Milestone total ($${totalAmount.toFixed(2)}) must equal contract amount ($${expectedMilestoneTotal.toFixed(2)}${expectedMilestoneTotal !== bid.amount ? " = bid minus 15% deposit" : ""}).`
      );
    }

    for (const m of milestones) {
      if (!m.description?.trim() || (m.amount ?? 0) <= 0) {
        throw new Error("Each milestone must have a description and amount > 0");
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("bids")
      .update({
        suggested_milestones: milestones.map((m) => ({
          description: m.description.trim(),
          amount: Number(m.amount),
        })),
      })
      .eq("id", bidId)
      .eq("gig_id", gigId)
      .eq("digger_id", diggerProfile.id);

    if (updateError) throw new Error(updateError.message ?? "Failed to save suggested plan");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Milestone plan suggested. The client can review and create the contract when they’re ready.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
