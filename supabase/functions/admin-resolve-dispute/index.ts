import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";
import { getStripeConfig } from "../_shared/stripe.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-RESOLVE-DISPUTE] ${step}${s}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);

    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      dispute_id?: string;
      resolution_type?: string;
      admin_notes?: string;
    };

    const { dispute_id, resolution_type, admin_notes } = body;
    if (!dispute_id || !resolution_type) {
      return new Response(
        JSON.stringify({ error: "dispute_id and resolution_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validResolutions = ["closed_no_action", "refund_consumer", "release_to_digger", "partial_refund"];
    if (!validResolutions.includes(resolution_type)) {
      return new Response(JSON.stringify({ error: "Invalid resolution_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from("disputes")
      .select("id, status, transaction_id, milestone_payment_id")
      .eq("id", dispute_id)
      .single();

    if (disputeError || !dispute) {
      return new Response(JSON.stringify({ error: "Dispute not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dispute.status === "resolved") {
      return new Response(JSON.stringify({ error: "Dispute is already resolved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { secretKey: stripeSecretKey } = await getStripeConfig(supabaseAdmin);
    let stripe: Stripe | null = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" }) : null;

    if (resolution_type === "refund_consumer" && stripe) {
      let paymentIntentId: string | null = null;

      if (dispute.transaction_id) {
        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("stripe_payment_intent_id, status")
          .eq("id", dispute.transaction_id)
          .single();
        if (tx?.status === "refunded") {
          return new Response(JSON.stringify({ error: "Transaction is already refunded" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        paymentIntentId = tx?.stripe_payment_intent_id ?? null;
      }

      if (!paymentIntentId && dispute.milestone_payment_id) {
        const { data: milestone } = await supabaseAdmin
          .from("milestone_payments")
          .select("stripe_payment_intent_id")
          .eq("id", dispute.milestone_payment_id)
          .single();
        paymentIntentId = milestone?.stripe_payment_intent_id ?? null;
      }

      if (paymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
          metadata: { dispute_id, resolved_by_admin: user.id },
        });
        logStep("Refund created", { refundId: refund.id });

        if (dispute.transaction_id) {
          await supabaseAdmin
            .from("transactions")
            .update({ status: "refunded" })
            .eq("id", dispute.transaction_id);
        }
      } else {
        logStep("No payment intent found for refund; closing dispute as closed_no_action");
      }
    }

    if (resolution_type === "release_to_digger" && stripe && dispute.milestone_payment_id) {
      const { data: milestone, error: mErr } = await supabaseAdmin
        .from("milestone_payments")
        .select(
          "id, amount, digger_payout, stripe_payment_intent_id, stripe_transfer_id, escrow_contract_id, escrow_contracts!inner(digger_id)"
        )
        .eq("id", dispute.milestone_payment_id)
        .single();

      if (!mErr && milestone?.stripe_payment_intent_id && !(milestone as any).stripe_transfer_id) {
        const contract = (milestone as any).escrow_contracts;
        const diggerId = contract?.digger_id;
        const { data: diggerProfile } = await supabaseAdmin
          .from("digger_profiles")
          .select("stripe_connect_account_id")
          .eq("id", diggerId)
          .single();

        if (diggerProfile?.stripe_connect_account_id) {
          const amountCents = Math.round(Number(milestone.digger_payout) * 100);
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: "usd",
            destination: diggerProfile.stripe_connect_account_id,
            description: `Admin release - milestone ${milestone.id}`,
            metadata: {
              milestone_payment_id: milestone.id,
              dispute_id,
              admin_resolved: user.id,
            },
          });
          logStep("Transfer created for release_to_digger", { transferId: transfer.id });

          await supabaseAdmin
            .from("milestone_payments")
            .update({
              status: "paid",
              stripe_transfer_id: transfer.id,
              released_at: new Date().toISOString(),
            })
            .eq("id", milestone.id);
        }
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("disputes")
      .update({
        status: "resolved",
        resolution_type,
        admin_notes: admin_notes ?? null,
        resolved_at: new Date().toISOString(),
        resolved_by_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute_id);

    if (updateError) {
      logStep("Failed to update dispute", { error: updateError.message });
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Dispute resolved" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
