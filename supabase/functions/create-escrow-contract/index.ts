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
    const { bidId, milestones, contractType, hourlyRate, estimatedHours } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error("User not authenticated");

    // Get bid details
    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("*, gigs!inner(*), digger_profiles!inner(*)")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) throw new Error("Bid not found");
    if (bid.status !== "accepted") throw new Error("Bid must be accepted first");

    const totalAmount = bid.amount;
    
    // Get digger's subscription tier for escrow fee calculation
    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("subscription_tier")
      .eq("id", bid.digger_id)
      .single();
    
    const tier = diggerProfile?.subscription_tier || 'free';
    const escrowFeeRates = { free: 10.0, pro: 6.0, premium: 3.0 };
    const platformFeePercentage = escrowFeeRates[tier as keyof typeof escrowFeeRates] || 10.0;
    const platformFeeAmount = totalAmount * (platformFeePercentage / 100);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Stripe customer if needed
    let customerId = null;
    const { data: customers } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const customerList = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customerList.data.length > 0) {
      customerId = customerList.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email! });
      customerId = customer.id;
    }

    // Create payment intent for full escrow amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "usd",
      customer: customerId,
      metadata: {
        type: "escrow",
        bidId: bidId,
        gigId: bid.gig_id,
        diggerId: bid.digger_id,
      },
    });

    // Create escrow contract
    const { data: escrowContract, error: escrowError } = await supabaseClient
      .from("escrow_contracts")
      .insert({
        gig_id: bid.gig_id,
        consumer_id: user.id,
        digger_id: bid.digger_id,
        total_amount: totalAmount,
        platform_fee_percentage: platformFeePercentage,
        platform_fee_amount: platformFeeAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: "pending",
        contract_type: contractType || "fixed",
        hourly_rate: contractType === "hourly" ? hourlyRate : null,
        estimated_hours: contractType === "hourly" ? estimatedHours : null,
      })
      .select()
      .single();

    if (escrowError) throw escrowError;

    // Create milestones
    if (milestones && milestones.length > 0) {
      const milestoneInserts = milestones.map((m: any, index: number) => {
        const milestoneAmount = m.amount;
        // Apply $10 minimum fee per progress payment
        const milestoneFee = Math.max(10, milestoneAmount * (platformFeePercentage / 100));
        const milestonePayout = milestoneAmount - milestoneFee;

        return {
          escrow_contract_id: escrowContract.id,
          milestone_number: index + 1,
          description: m.description,
          amount: milestoneAmount,
          platform_fee: milestoneFee,
          digger_payout: milestonePayout,
          hours_worked: contractType === "hourly" ? m.hoursWorked : null,
          hourly_rate: contractType === "hourly" ? hourlyRate : null,
        };
      });

      const { error: milestonesError } = await supabaseClient
        .from("milestone_payments")
        .insert(milestoneInserts);

      if (milestonesError) throw milestonesError;
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        escrowContractId: escrowContract.id,
      }),
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