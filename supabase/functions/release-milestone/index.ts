import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { milestoneId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error("User not authenticated");

    // Get milestone and contract details
    const { data: milestone, error: milestoneError } = await supabaseClient
      .from("milestone_payments")
      .select(`
        *,
        escrow_contracts!inner(
          *,
          digger_profiles!inner(stripe_connect_account_id, stripe_connect_charges_enabled)
        )
      `)
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) throw new Error("Milestone not found");

    const escrowContract = (milestone as any).escrow_contracts;
    
    // Verify user is the consumer
    if (escrowContract.consumer_id !== user.id) {
      throw new Error("Unauthorized");
    }

    if (milestone.status !== "pending") {
      throw new Error("Milestone already released or not pending");
    }

    if (escrowContract.status !== "funded") {
      throw new Error("Escrow contract must be funded first");
    }

    const diggerProfile = escrowContract.digger_profiles;
    
    if (!diggerProfile.stripe_connect_account_id || !diggerProfile.stripe_connect_charges_enabled) {
      throw new Error("Digger must complete Stripe Connect onboarding");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create transfer to digger
    const transfer = await stripe.transfers.create({
      amount: Math.round(milestone.digger_payout * 100), // Convert to cents
      currency: "usd",
      destination: diggerProfile.stripe_connect_account_id,
      metadata: {
        milestoneId: milestone.id,
        escrowContractId: escrowContract.id,
      },
    });

    // Update milestone status
    const { error: updateError } = await supabaseClient
      .from("milestone_payments")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .eq("id", milestoneId);

    if (updateError) throw updateError;

    // Create transaction record
    await supabaseClient
      .from("transactions")
      .insert({
        bid_id: escrowContract.id, // Using escrow contract ID as reference
        gig_id: escrowContract.gig_id,
        consumer_id: escrowContract.consumer_id,
        digger_id: escrowContract.digger_id,
        total_amount: milestone.amount,
        commission_amount: milestone.platform_fee,
        commission_rate: escrowContract.platform_fee_percentage,
        digger_payout: milestone.digger_payout,
        status: "completed",
        completed_at: new Date().toISOString(),
        is_escrow: true,
        escrow_contract_id: escrowContract.id,
        milestone_payment_id: milestone.id,
      });

    // Check if all milestones are released
    const { data: allMilestones } = await supabaseClient
      .from("milestone_payments")
      .select("status")
      .eq("escrow_contract_id", escrowContract.id);

    const allReleased = allMilestones?.every(m => m.status === "released");

    if (allReleased) {
      // Update contract status to completed
      await supabaseClient
        .from("escrow_contracts")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", escrowContract.id);

      // Update gig status to completed
      await supabaseClient
        .from("gigs")
        .update({ status: "completed" })
        .eq("id", escrowContract.gig_id);
    }

    return new Response(
      JSON.stringify({ success: true, transferId: transfer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});