import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DIGGER-ACCEPT-AWARD] ${step}${detailsStr}`);
};

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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { bidId, gigId, diggerId } = await req.json();

    if (!bidId || !gigId || !diggerId) {
      throw new Error("bidId, gigId, and diggerId are required");
    }

    logStep("Processing award acceptance", { bidId, gigId, diggerId, userId: user.id });

    // Verify the digger owns this bid
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, user_id")
      .eq("id", diggerId)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized - not your profile");
    }

    // Get the bid and verify it's awarded
    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("*")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error(`Bid not found: ${bidError?.message}`);
    }

    if (!bid.awarded) {
      throw new Error("This bid has not been awarded yet");
    }

    if (bid.digger_id !== diggerId) {
      throw new Error("This bid does not belong to you");
    }

    // Check if already accepted
    if (bid.status === "accepted" || bid.referral_fee_charged_at) {
      logStep("Bid already accepted", { status: bid.status });
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyAccepted: true,
          message: "You've already accepted this job" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For success-based (exclusive) bids, charge the referral fee
    if (bid.pricing_model === "success_based") {
      logStep("Charging referral fee for exclusive bid acceptance", {
        bidId,
        amount: bid.amount
      });

      // Invoke the charge-referral-fee function
      const { data: feeResult, error: feeError } = await supabaseClient.functions.invoke(
        "charge-referral-fee",
        {
          body: { bidId, gigId, diggerId }
        }
      );

      if (feeError) {
        throw new Error(`Payment failed: ${feeError.message}`);
      }

      logStep("Referral fee result", feeResult);

      // If payment requires checkout session
      if (feeResult?.requiresPayment && feeResult?.checkoutUrl) {
        return new Response(
          JSON.stringify({
            success: true,
            requiresPayment: true,
            checkoutUrl: feeResult.checkoutUrl,
            feeCents: feeResult.feeCents,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If payment failed
      if (!feeResult?.success && !feeResult?.skipped) {
        throw new Error("Payment failed. Please try again or add a payment method.");
      }
    }

    // Update bid status to accepted
    const { error: updateError } = await supabaseClient
      .from("bids")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bidId);

    if (updateError) {
      throw new Error(`Failed to update bid: ${updateError.message}`);
    }

    // Update gig status to active
    await supabaseClient
      .from("gigs")
      .update({
        status: "active",
      })
      .eq("id", gigId);

    // Release deposit to Digger if there's a paid deposit
    // NEW MODEL: 15% deposit, 8% referral fee retained, remaining released to Digger
    const { data: deposit, error: depositError } = await supabaseClient
      .from("gigger_deposits")
      .select("*")
      .eq("bid_id", bidId)
      .eq("status", "paid")
      .single();

    if (deposit && !depositError) {
      // Calculate amounts: 8% referral fee is retained, rest goes to Digger
      const bidAmount = bid.amount || ((bid.amount_min || 0) + (bid.amount_max || 0)) / 2;
      const bidAmountCents = Math.round(bidAmount * 100);
      const referralFeeCents = Math.round(bidAmountCents * 0.08); // 8% referral fee
      const releasedToDiggerCents = deposit.deposit_amount_cents - referralFeeCents;

      logStep("Processing deposit release", {
        depositId: deposit.id,
        bidAmount,
        depositAmountCents: deposit.deposit_amount_cents,
        referralFeeCents,
        releasedToDiggerCents,
      });

      // Update deposit status to released
      await supabaseClient
        .from("gigger_deposits")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          released_to_digger_cents: releasedToDiggerCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      // Record the referral fee as charged
      await supabaseClient
        .from("bids")
        .update({
          referral_fee_cents: referralFeeCents,
          referral_fee_charged_at: new Date().toISOString(),
        })
        .eq("id", bidId);

      // TODO: If using Stripe Connect, transfer releasedToDiggerCents to Digger's connected account
      logStep("Deposit processed - referral fee retained, remainder released to Digger", {
        depositId: deposit.id,
        referralFee: referralFeeCents / 100,
        releasedToDigger: releasedToDiggerCents / 100,
      });
    }

    logStep("Award accepted successfully", { bidId, gigId });

    // Notify the client
    const { data: gig } = await supabaseClient
      .from("gigs")
      .select("consumer_id, title")
      .eq("id", gigId)
      .single();

    if (gig?.consumer_id) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: gig.consumer_id,
          type: "digger_accepted",
          title: "🎉 Digger Accepted the Job!",
          message: `The professional you hired has accepted and is ready to start on "${gig.title}".`,
          link: `/gig/${gigId}`,
          metadata: {
            gig_id: gigId,
            bid_id: bidId,
            digger_id: diggerId,
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        accepted: true,
        message: "Job accepted successfully. Time to start work!",
      }),
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