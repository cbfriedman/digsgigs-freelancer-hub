import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PENALTY_CENTS = 10000; // $100 flat penalty for decline

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DIGGER-DECLINE-AWARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const { bidId, gigId, diggerId, reason } = await req.json();

    if (!bidId || !gigId || !diggerId) {
      throw new Error("bidId, gigId, and diggerId are required");
    }

    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, user_id, stripe_customer_id")
      .eq("id", diggerId)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized - not your profile");
    }

    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("id, digger_id, awarded, amount")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error("Bid not found");
    }

    if (bid.digger_id !== diggerId) {
      throw new Error("This bid does not belong to you");
    }

    if (!bid.awarded) {
      throw new Error("This bid has not been awarded");
    }

    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("id, status, consumer_id, awarded_bid_id, title")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    if (gig.awarded_bid_id !== bidId) {
      throw new Error("This gig is not awarded to this bid");
    }

    const allowedStatuses = ["awarded", "in_progress"];
    if (!allowedStatuses.includes(gig.status)) {
      throw new Error("This gig is not in a state that can be declined");
    }

    const now = new Date().toISOString();
    let refunded = false;
    let penaltyCents: number | null = null;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

      const { data: deposit } = await supabaseClient
        .from("gigger_deposits")
        .select("id, status, stripe_payment_intent_id, deposit_amount_cents")
        .eq("bid_id", bidId)
        .eq("status", "paid")
        .is("refunded_at", null)
        .maybeSingle();

      if (deposit?.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({
            payment_intent: deposit.stripe_payment_intent_id,
            reason: "requested_by_customer",
          });
          logStep("Gigger deposit refunded", { depositId: deposit.id });

          await supabaseClient
            .from("gigger_deposits")
            .update({
              status: "refunded",
              refunded_at: now,
              refund_reason: "digger_declined_award",
            })
            .eq("id", deposit.id);

          refunded = true;
        } catch (refundErr) {
          logStep("Refund failed", { error: refundErr instanceof Error ? refundErr.message : String(refundErr) });
        }

        penaltyCents = PENALTY_CENTS;

        if (diggerProfile.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(diggerProfile.stripe_customer_id) as Stripe.Customer;
            const defaultPm = customer.invoice_settings?.default_payment_method;
            if (defaultPm) {
              await stripe.paymentIntents.create({
                amount: penaltyCents,
                currency: "usd",
                customer: diggerProfile.stripe_customer_id,
                payment_method: defaultPm as string,
                off_session: true,
                confirm: true,
                description: `$100 declined award penalty - ${gig.title}`,
                metadata: {
                  type: "decline_award_penalty",
                  bid_id: bidId,
                  gig_id: gigId,
                  digger_id: diggerId,
                },
              });
              logStep("Digger penalty charged", { penaltyCents });
              await supabaseClient
                .from("bids")
                .update({
                  referral_fee_cents: penaltyCents,
                  referral_fee_charged_at: now,
                })
                .eq("id", bidId);
            } else {
              logStep("No payment method for penalty", { diggerId });
            }
          } catch (chargeErr) {
            logStep("Penalty charge failed", { error: chargeErr instanceof Error ? chargeErr.message : String(chargeErr) });
          }
        }
      }
    }

    await supabaseClient
      .from("bids")
      .update({
        awarded: false,
        awarded_at: null,
        awarded_by: null,
        award_declined_at: now,
        award_decline_reason: typeof reason === "string" ? reason.trim().slice(0, 500) : null,
        status: "pending",
        updated_at: now,
      })
      .eq("id", bidId);

    await supabaseClient
      .from("gigs")
      .update({
        status: "open",
        awarded_bid_id: null,
        awarded_digger_id: null,
        awarded_at: null,
        updated_at: now,
      })
      .eq("id", gigId);

    if (gig.consumer_id) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: gig.consumer_id,
          type: "digger_declined_award",
          title: "Award declined",
          message: refunded
            ? `The professional declined the award for "${gig.title}". Your 15% deposit has been refunded. You can award another bid.`
            : `The professional declined the award for "${gig.title}". You can award another bid or re-award later.`,
          link: `/gig/${gigId}`,
          metadata: {
            gig_id: gigId,
            bid_id: bidId,
            digger_id: diggerId,
            reason: typeof reason === "string" ? reason.trim().slice(0, 500) : null,
            refunded,
          },
        });
    }

    // Insert "declined" system message into chat
    try {
      const bidAmount = bid.amount ?? null;
      let { data: conv } = await supabaseClient
        .from("conversations")
        .select("id")
        .eq("gig_id", gigId)
        .eq("digger_id", diggerId)
        .eq("consumer_id", gig.consumer_id)
        .is("admin_id", null)
        .maybeSingle();
      if (!conv?.id) {
        const { data: newConv } = await supabaseClient
          .from("conversations")
          .insert({ gig_id: gigId, digger_id: diggerId, consumer_id: gig.consumer_id })
          .select("id")
          .single();
        conv = newConv;
      }
      if (conv?.id) {
        await supabaseClient.from("messages").insert({
          conversation_id: conv.id,
          sender_id: diggerProfile.user_id,
          content: "Declined the award.",
          metadata: { _type: "award_event", event: "declined", bid_id: bidId, gig_id: gigId, amount: bidAmount },
        });
      }
    } catch (chatErr) {
      logStep("Failed to insert declined chat message (non-blocking)", { error: chatErr instanceof Error ? chatErr.message : String(chatErr) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Award declined. The client can award another bid.",
        refunded: !!refunded,
        penaltyCharged: penaltyCents != null && penaltyCents > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
