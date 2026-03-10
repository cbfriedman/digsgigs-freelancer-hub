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

      // Load digger profile (minimal columns first so older DBs without _live/payout columns still work)
      let diggerProfile: Record<string, unknown> | null = null;
      let diggerProfileError: { message: string } | null = null;
      const fullSelect = "id, user_id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live, payout_provider, payout_email";
      const minimalSelect = "id, user_id, stripe_connect_account_id, stripe_connect_charges_enabled";
      const res = await supabaseAdmin
        .from("digger_profiles")
        .select(fullSelect)
        .eq("id", contract.digger_id)
        .maybeSingle();
      diggerProfile = res.data as Record<string, unknown> | null;
      diggerProfileError = res.error;

      if (diggerProfileError && /column|does not exist|undefined/i.test(diggerProfileError.message)) {
        logStep("Digger profile full select failed (missing columns?), retrying minimal", { error: diggerProfileError.message });
        const fallback = await supabaseAdmin
          .from("digger_profiles")
          .select(minimalSelect)
          .eq("id", contract.digger_id)
          .maybeSingle();
        diggerProfile = fallback.data as Record<string, unknown> | null;
        diggerProfileError = fallback.error;
        if (diggerProfile) {
          diggerProfile.stripe_connect_account_id_live = null;
          diggerProfile.stripe_connect_charges_enabled_live = null;
          diggerProfile.payout_provider = null;
          diggerProfile.payout_email = null;
        }
      }

      if (diggerProfileError) {
        logStep("Digger profile query failed", { diggerId: contract.digger_id, error: diggerProfileError.message });
        throw new Error("Could not load professional's payout profile. Please try again or contact support.");
      }
      if (!diggerProfile) {
        logStep("Digger profile not found for contract", { contractDiggerId: contract.digger_id });
        throw new Error("Professional profile not found for this contract. Please contact support.");
      }

      const useAlternativePayout = ["paypal", "payoneer", "wise"].includes((diggerProfile as any)?.payout_provider ?? "");
      let connectAccountId = isLive ? (diggerProfile as any)?.stripe_connect_account_id_live : diggerProfile?.stripe_connect_account_id;
      let canReceivePayments = !!(isLive ? (diggerProfile as any)?.stripe_connect_charges_enabled_live : diggerProfile?.stripe_connect_charges_enabled);
      let connectAccountWasAutoCreated = false;
      // User-level fallback: if this profile has no Connect account, any other profile for the same user might have it. Prefer one that is onboarded/charges_enabled so the Digger sees money in their dashboard.
      if (!connectAccountId && (diggerProfile as any)?.user_id) {
        const { data: profilesWithAccount } = await supabaseAdmin
          .from("digger_profiles")
          .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live")
          .eq("user_id", (diggerProfile as any).user_id)
          .not(isLive ? "stripe_connect_account_id_live" : "stripe_connect_account_id", "is", null)
          .limit(5);
        const candidates = (profilesWithAccount ?? []) as { id: string; stripe_connect_account_id?: string; stripe_connect_charges_enabled?: boolean; stripe_connect_account_id_live?: string; stripe_connect_charges_enabled_live?: boolean }[];
        const preferred = candidates.find((p) => (isLive ? p.stripe_connect_charges_enabled_live : p.stripe_connect_charges_enabled)) ?? candidates[0];
        if (preferred) {
          const foundId = isLive ? preferred.stripe_connect_account_id_live : preferred.stripe_connect_account_id;
          const foundCharges = isLive ? preferred.stripe_connect_charges_enabled_live : preferred.stripe_connect_charges_enabled;
          if (foundId) {
            connectAccountId = foundId;
            canReceivePayments = !!foundCharges;
            await supabaseAdmin
              .from("digger_profiles")
              .update(isLive
                ? { stripe_connect_account_id_live: foundId, stripe_connect_charges_enabled_live: canReceivePayments }
                : { stripe_connect_account_id: foundId, stripe_connect_charges_enabled: canReceivePayments })
              .eq("id", contract.digger_id);
            logStep("Recovered connect account from same-user profile", { diggerId: contract.digger_id, sourceProfileId: preferred.id });
          }
        }
      }
      if (!connectAccountId && (diggerProfile as any)?.user_id) {
        const { data: siblingRows } = await supabaseAdmin
          .from("digger_profiles")
          .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live")
          .eq("user_id", (diggerProfile as any).user_id)
          .neq("id", (diggerProfile as any).id)
          .not(isLive ? "stripe_connect_account_id_live" : "stripe_connect_account_id", "is", null)
          .limit(5);
        const siblings = (siblingRows ?? []) as { id: string; stripe_connect_account_id?: string; stripe_connect_charges_enabled?: boolean; stripe_connect_account_id_live?: string; stripe_connect_charges_enabled_live?: boolean }[];
        const siblingProfile = siblings.find((p) => (isLive ? p.stripe_connect_charges_enabled_live : p.stripe_connect_charges_enabled)) ?? siblings[0];
        if (siblingProfile) {
          const siblingConnect = isLive ? siblingProfile.stripe_connect_account_id_live : siblingProfile.stripe_connect_account_id;
          if (siblingConnect) {
            connectAccountId = siblingConnect;
            canReceivePayments = !!(isLive ? siblingProfile.stripe_connect_charges_enabled_live : siblingProfile.stripe_connect_charges_enabled);
            await supabaseAdmin
              .from("digger_profiles")
              .update(isLive
                ? { stripe_connect_account_id_live: siblingConnect, stripe_connect_charges_enabled_live: canReceivePayments }
                : { stripe_connect_account_id: siblingConnect, stripe_connect_charges_enabled: canReceivePayments })
              .eq("id", contract.digger_id);
            logStep("Recovered connect account from sibling profile", { diggerId: contract.digger_id, sourceProfileId: siblingProfile.id });
          }
        }
      }
      if (!connectAccountId && (diggerProfile as any)?.user_id) {
        // Final fallback: recover Connect account by matching email in Stripe. Prefer auth email (create-connect-account uses it).
        const diggerUserId = (diggerProfile as any).user_id;
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(diggerUserId);
        let diggerEmail = authUser?.user?.email ?? undefined;
        if (!diggerEmail?.trim()) {
          const { data: diggerUserProfile } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", diggerUserId)
            .maybeSingle();
          diggerEmail = (diggerUserProfile as any)?.email as string | undefined;
        }
        const accountsRes = await stripe.accounts.list({ limit: 100 });
        const accountCount = accountsRes?.data?.length ?? 0;
        logStep("Stripe Connect email-match attempt", {
          diggerUserId,
          hasEmail: !!diggerEmail?.trim(),
          stripeAccountsListed: accountCount,
        });
        if (diggerEmail?.trim()) {
          const byEmail = accountsRes.data.filter((a) => a.email?.toLowerCase() === diggerEmail!.toLowerCase());
          // Prefer the account the Digger actually onboarded (details_submitted) so they see the money in their dashboard
          const matched = byEmail.find((a) => a.details_submitted) ?? byEmail[0];
          if (matched?.id) {
            connectAccountId = matched.id;
            const detailsSubmitted = !!matched.details_submitted;
            const chargesEnabled = !!matched.charges_enabled;
            const payoutsEnabled = !!matched.payouts_enabled;
            canReceivePayments = chargesEnabled || payoutsEnabled || (!isLive && detailsSubmitted);
            await supabaseAdmin
              .from("digger_profiles")
              .update(isLive
                ? {
                    stripe_connect_account_id_live: matched.id,
                    stripe_connect_onboarded_live: detailsSubmitted,
                    stripe_connect_charges_enabled_live: canReceivePayments,
                  }
                : {
                    stripe_connect_account_id: matched.id,
                    stripe_connect_onboarded: detailsSubmitted,
                    stripe_connect_charges_enabled: canReceivePayments,
                  })
              .eq("id", contract.digger_id);
            logStep("Recovered connect account from Stripe account email match", { diggerId: contract.digger_id });
          } else {
            logStep("Stripe email-match: no account in list matched digger email", { stripeAccountsListed: accountCount });
          }
        } else {
          logStep("Stripe email-match: no digger email available (auth + profiles)", { diggerUserId });
        }
      }
      if (!connectAccountId && !isLive && (diggerProfile as any)?.user_id) {
        // Last-resort sandbox fallback: create a test Connect account so checkout isn't blocked.
        const diggerUserId = (diggerProfile as any).user_id;
        const { data: authForCreate } = await supabaseAdmin.auth.admin.getUserById(diggerUserId);
        let diggerEmailFallback = authForCreate?.user?.email ?? undefined;
        if (!diggerEmailFallback?.trim()) {
          const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", diggerUserId).maybeSingle();
          diggerEmailFallback = (prof as any)?.email as string | undefined;
        }
        logStep("Sandbox auto-create attempt", { hasEmail: !!diggerEmailFallback?.trim() });
        if (diggerEmailFallback?.trim()) {
          const account = await stripe.accounts.create({
            type: "express",
            email: diggerEmailFallback,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_profile: { name: diggerEmailFallback },
          });
          connectAccountId = account.id;
          canReceivePayments = true;
          connectAccountWasAutoCreated = true;
          await supabaseAdmin
            .from("digger_profiles")
            .update({
              stripe_connect_account_id: account.id,
              stripe_connect_onboarded: !!account.details_submitted,
              stripe_connect_charges_enabled: true,
            })
            .eq("id", contract.digger_id);
            logStep("Auto-created sandbox Connect account for payout recovery", { diggerId: contract.digger_id, connectAccountId: account.id });
        } else {
          logStep("Sandbox auto-create skipped: no email for digger", { diggerUserId });
        }
      }
      if (useAlternativePayout && (diggerProfile as any)?.payout_provider === "paypal" && (diggerProfile as any)?.payout_email) {
        canReceivePayments = true;
      }
      if (connectAccountId && !canReceivePayments) {
        try {
          const account = await stripe.accounts.retrieve(connectAccountId);
          const detailsSubmitted = !!account.details_submitted;
          const chargesEnabled = !!account.charges_enabled;
          const payoutsEnabled = !!account.payouts_enabled;
          // In test/sandbox, Stripe can keep charges_enabled false briefly after onboarding; treat details_submitted as ready.
          canReceivePayments = chargesEnabled || payoutsEnabled || (!isLive && detailsSubmitted);
          const updatePayload = isLive
            ? { stripe_connect_onboarded_live: detailsSubmitted, stripe_connect_charges_enabled_live: canReceivePayments }
            : { stripe_connect_onboarded: detailsSubmitted, stripe_connect_charges_enabled: canReceivePayments };
          await supabaseAdmin
            .from("digger_profiles")
            .update(updatePayload)
            .eq("id", contract.digger_id);
        } catch {
          // In test mode, if we have a Connect account ID but Stripe retrieve failed (e.g. transient), allow payment so we don't block; Stripe will reject the transfer if the account can't receive.
          if (!isLive && connectAccountId) canReceivePayments = true;
        }
      }
      // In test/sandbox, if Digger has a Connect account ID for this mode, always allow payment attempt; Stripe will reject the charge/transfer if the account cannot receive.
      if (!isLive && connectAccountId && !canReceivePayments) {
        canReceivePayments = true;
        logStep("Test mode: allowing payment (Connect account exists; Stripe will reject if not ready)", { connectAccountId: connectAccountId.slice(0, 12) + "..." });
      }
      if (!canReceivePayments) {
        const hasOtherMode = isLive ? !!diggerProfile?.stripe_connect_account_id : !!(diggerProfile as any)?.stripe_connect_account_id_live;
        // Diagnostic: log why checkout was blocked so logs show the root cause.
        logStep("Checkout blocked: canReceivePayments false", {
          isLive,
          platformStripeMode: stripeMode,
          hasConnectAccountId: !!connectAccountId,
          hasOtherMode,
          diggerId: contract.digger_id,
          diggerProfileId: (diggerProfile as any)?.id,
          diggerUserId: (diggerProfile as any)?.user_id,
          stripe_connect_account_id: (diggerProfile as any)?.stripe_connect_account_id ? "set" : "null",
          stripe_connect_account_id_live: (diggerProfile as any)?.stripe_connect_account_id_live ? "set" : "null",
          cause: !connectAccountId
            ? "No Connect account on this profile (and recovery fallbacks did not find one). Ensure: 1) Digger completed Get paid with platform in same Stripe mode (Sandbox vs Live), 2) Admin Stripe mode matches."
            : "DB has charges_enabled false and Stripe re-check/override did not apply.",
        });
        const msg = !connectAccountId && hasOtherMode
          ? (isLive
              ? "The professional connected payouts for Sandbox only. Switch the platform to Sandbox (Admin → Stripe mode) to pay them, or ask them to connect for Live."
              : "The professional connected payouts for Live only. Switch the platform to Live (Admin → Stripe mode) to pay them, or ask them to connect again with the platform in Sandbox.")
          : (isLive
              ? "The professional hasn't set up payouts for live payments yet. Ask them to complete \"Get paid\" while the platform is in live mode."
              : "The professional hasn't set up payouts yet. Ask them to complete \"Get paid\" in their account (Account → Get paid, then Connect payout account). If they already did, ask them to click \"Confirm payout account\" or \"Reconnect payout account\" once so the platform can link their Stripe account, then try again.");
        throw new Error(msg);
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
      // 7% comes from platform (deposit); only milestone payout goes via destination charge. For alternative (PayPal etc.) charge to platform only.
      const transferFromThisPaymentCents = diggerPayoutCents - depositAdvanceCents;
      const sessionParams: Record<string, unknown> = {
        customer: customerId ?? undefined,
        customer_email: customerId ? undefined : giggerProfile?.email ?? undefined,
        payment_method_types: ["card", "us_bank_account"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/gig/${contract.gig_id}?milestone_paid=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/gig/${contract.gig_id}?milestone_cancelled=true`,
        metadata: {
          type: "milestone_payment",
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          consumer_id: contract.consumer_id,
          digger_id: contract.digger_id,
          gig_id: contract.gig_id,
          ...(connectAccountWasAutoCreated ? { connect_account_auto_created: "true" } : {}),
        },
      };
      if (!useAlternativePayout && connectAccountId && transferFromThisPaymentCents > 0) {
        // Verify Connect account is the one the Digger onboarded (so they receive the money)
        try {
          const connectAccount = await stripe.accounts.retrieve(connectAccountId);
          const onboarded = !!connectAccount.details_submitted;
          logStep("Checkout destination Connect account", {
            destinationId: connectAccountId.slice(0, 12) + "...",
            details_submitted: onboarded,
            charges_enabled: !!connectAccount.charges_enabled,
            was_auto_created: connectAccountWasAutoCreated,
          });
          if (!onboarded && !connectAccountWasAutoCreated) {
            logStep("WARNING: Connect account not fully onboarded - Digger should complete Get paid (Reconnect) and add bank so they receive this payout", { destinationId: connectAccountId.slice(0, 12) + "..." });
          }
        } catch (e) {
          logStep("Could not retrieve Connect account (proceeding anyway)", { error: e instanceof Error ? e.message : String(e) });
        }
        (sessionParams as any).payment_intent_data = {
          transfer_data: {
            destination: connectAccountId,
            amount: transferFromThisPaymentCents,
          },
        };
      }
      const session = await stripe.checkout.sessions.create(sessionParams as any);

      logStep("Checkout session created for milestone", { sessionId: session.id, destinationConnectId: connectAccountId ? connectAccountId.slice(0, 12) + "..." : null });
      return new Response(
        JSON.stringify({ requiresPayment: true, checkoutUrl: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const amountCents = Math.round(Number(milestone.amount) * 100); // gross
    const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100)); // 3% from Gigger

    // Load digger profile for saved-card path — use same resilient loading as Checkout (maybeSingle + fallback) so recovery can run
    const fullSelectSaved = "id, user_id, stripe_connect_account_id, stripe_connect_account_id_live, stripe_connect_charges_enabled, stripe_connect_charges_enabled_live, payout_provider, payout_email";
    const minimalSelectSaved = "id, user_id, stripe_connect_account_id, stripe_connect_charges_enabled";
    let diggerProfileSaved: Record<string, unknown> | null = null;
    let diggerProfileSavedError: { message: string } | null = null;
    const resSaved = await supabaseAdmin
      .from("digger_profiles")
      .select(fullSelectSaved)
      .eq("id", contract.digger_id)
      .maybeSingle();
    diggerProfileSaved = resSaved.data as Record<string, unknown> | null;
    diggerProfileSavedError = resSaved.error;
    if (diggerProfileSavedError && /column|does not exist|undefined/i.test(diggerProfileSavedError.message)) {
      logStep("Saved-card: digger profile full select failed, retrying minimal", { error: diggerProfileSavedError.message });
      const fallbackSaved = await supabaseAdmin
        .from("digger_profiles")
        .select(minimalSelectSaved)
        .eq("id", contract.digger_id)
        .maybeSingle();
      diggerProfileSaved = fallbackSaved.data as Record<string, unknown> | null;
      diggerProfileSavedError = fallbackSaved.error;
      if (diggerProfileSaved) {
        (diggerProfileSaved as any).stripe_connect_account_id_live = null;
        (diggerProfileSaved as any).stripe_connect_charges_enabled_live = null;
        (diggerProfileSaved as any).payout_provider = null;
        (diggerProfileSaved as any).payout_email = null;
      }
    }
    if (diggerProfileSavedError) {
      logStep("Saved-card: digger profile query failed", { diggerId: contract.digger_id, error: diggerProfileSavedError.message });
      return new Response(
        JSON.stringify({ error: "Could not load professional's payout profile. Please try again or use Approve & pay (Checkout)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    if (!diggerProfileSaved) {
      logStep("Saved-card: digger profile not found", { contractDiggerId: contract.digger_id });
      return new Response(
        JSON.stringify({ error: "Professional profile not found for this contract. Please use Approve & pay (Checkout) or contact support." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Compute digger payout and 7% deposit advance before creating PI so we can use transfer_data (destination charge).
    // Using transfer_data avoids "insufficient available funds" because the transfer happens at capture, not from platform balance.
    let connectAccountIdSaved = isLive ? (diggerProfileSaved as any)?.stripe_connect_account_id_live : diggerProfileSaved?.stripe_connect_account_id;
    const useAlternativePayoutSaved = ["paypal", "payoneer", "wise"].includes((diggerProfileSaved as any)?.payout_provider ?? "");
    // Mirror Checkout recovery so saved-card finds the same Connect account (user-level, sibling, email match).
    if (!connectAccountIdSaved && (diggerProfileSaved as any)?.user_id) {
      const { data: profilesWithAccount } = await supabaseAdmin
        .from("digger_profiles")
        .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live")
        .eq("user_id", (diggerProfileSaved as any).user_id)
        .not(isLive ? "stripe_connect_account_id_live" : "stripe_connect_account_id", "is", null)
        .limit(5);
      const candidates = (profilesWithAccount ?? []) as { id: string; stripe_connect_account_id?: string; stripe_connect_charges_enabled?: boolean; stripe_connect_account_id_live?: string; stripe_connect_charges_enabled_live?: boolean }[];
      const preferred = candidates.find((p) => (isLive ? p.stripe_connect_charges_enabled_live : p.stripe_connect_charges_enabled)) ?? candidates[0];
      if (preferred) {
        const foundId = isLive ? preferred.stripe_connect_account_id_live : preferred.stripe_connect_account_id;
        if (foundId) {
          connectAccountIdSaved = foundId;
          const updatePayload = isLive
            ? { stripe_connect_account_id_live: foundId, stripe_connect_charges_enabled_live: !!(preferred as any)?.stripe_connect_charges_enabled_live }
            : { stripe_connect_account_id: foundId, stripe_connect_charges_enabled: !!preferred.stripe_connect_charges_enabled };
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("id", contract.digger_id);
          // Backfill all profiles for this user so other contracts and future requests find the Connect account
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("user_id", (diggerProfileSaved as any).user_id);
          logStep("Recovered saved-card connect account from same-user profile", { diggerId: contract.digger_id, sourceProfileId: preferred.id });
        }
      }
    }
    if (!connectAccountIdSaved && (diggerProfileSaved as any)?.user_id) {
      const { data: siblingRows } = await supabaseAdmin
        .from("digger_profiles")
        .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live")
        .eq("user_id", (diggerProfileSaved as any).user_id)
        .neq("id", (diggerProfileSaved as any).id)
        .not(isLive ? "stripe_connect_account_id_live" : "stripe_connect_account_id", "is", null)
        .limit(5);
      const siblings = (siblingRows ?? []) as { id: string; stripe_connect_account_id?: string; stripe_connect_charges_enabled?: boolean; stripe_connect_account_id_live?: string; stripe_connect_charges_enabled_live?: boolean }[];
      const siblingProfile = siblings.find((p) => (isLive ? p.stripe_connect_charges_enabled_live : p.stripe_connect_charges_enabled)) ?? siblings[0];
      if (siblingProfile) {
        const siblingConnect = isLive ? siblingProfile.stripe_connect_account_id_live : siblingProfile.stripe_connect_account_id;
        if (siblingConnect) {
          connectAccountIdSaved = siblingConnect;
          const updatePayload = isLive
            ? { stripe_connect_account_id_live: siblingConnect, stripe_connect_charges_enabled_live: !!siblingProfile.stripe_connect_charges_enabled_live }
            : { stripe_connect_account_id: siblingConnect, stripe_connect_charges_enabled: !!siblingProfile.stripe_connect_charges_enabled };
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("id", contract.digger_id);
          // Backfill all profiles for this user
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("user_id", (diggerProfileSaved as any).user_id);
          logStep("Recovered saved-card connect account from sibling profile", { diggerId: contract.digger_id, sourceProfileId: siblingProfile.id });
        }
      }
    }
    if (!connectAccountIdSaved && (diggerProfileSaved as any)?.user_id) {
      const diggerUserIdSaved = (diggerProfileSaved as any).user_id;
      const { data: diggerUserProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", diggerUserIdSaved)
        .maybeSingle();
      let diggerEmailSaved = (diggerUserProfile as any)?.email as string | undefined;
      if (!diggerEmailSaved?.trim()) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(diggerUserIdSaved);
        diggerEmailSaved = authUser?.user?.email ?? undefined;
      }
      if (diggerEmailSaved?.trim()) {
        const accounts = await stripe.accounts.list({ limit: 100 });
        const byEmail = accounts.data.filter((a) => a.email?.toLowerCase() === diggerEmailSaved!.toLowerCase());
        const matched = byEmail.find((a) => a.details_submitted) ?? byEmail[0];
        if (matched?.id) {
          connectAccountIdSaved = matched.id;
          const detailsSubmitted = !!matched.details_submitted;
          const chargesEnabled = !!matched.charges_enabled;
          const payoutsEnabled = !!matched.payouts_enabled;
          const canReceiveSaved = chargesEnabled || payoutsEnabled || (!isLive && detailsSubmitted);
          const updatePayload = isLive
            ? {
                stripe_connect_account_id_live: matched.id,
                stripe_connect_onboarded_live: detailsSubmitted,
                stripe_connect_charges_enabled_live: canReceiveSaved,
              }
            : {
                stripe_connect_account_id: matched.id,
                stripe_connect_onboarded: detailsSubmitted,
                stripe_connect_charges_enabled: canReceiveSaved,
              };
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("id", contract.digger_id);
          // Backfill all profiles for this user so other contracts find the Connect account
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("user_id", diggerUserIdSaved);
          logStep("Recovered saved-card connect account from Stripe account email match", { diggerId: contract.digger_id });
        }
      }
    }
    if (!connectAccountIdSaved && !isLive && (diggerProfileSaved as any)?.user_id) {
      // Last-resort sandbox fallback: create a test Connect account automatically so saved-card isn't blocked.
      const diggerUserIdForCreate = (diggerProfileSaved as any).user_id;
      const { data: authForCreate } = await supabaseAdmin.auth.admin.getUserById(diggerUserIdForCreate);
      let diggerEmail = authForCreate?.user?.email ?? undefined;
      if (!diggerEmail?.trim()) {
        const { data: diggerUserProfile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", diggerUserIdForCreate)
          .maybeSingle();
        diggerEmail = (diggerUserProfile as any)?.email as string | undefined;
      }
      if (diggerEmail?.trim()) {
        const account = await stripe.accounts.create({
          type: "express",
          email: diggerEmail,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: { name: diggerEmail },
        });
        connectAccountIdSaved = account.id;
        await supabaseAdmin
          .from("digger_profiles")
          .update({
            stripe_connect_account_id: account.id,
            stripe_connect_onboarded: !!account.details_submitted,
            stripe_connect_charges_enabled: true,
          })
          .eq("id", contract.digger_id);
        logStep("Auto-created sandbox Connect account for saved-card payout recovery", { diggerId: contract.digger_id, connectAccountId: account.id });
      }
    }

    // Saved card: Digger must be able to receive (Connect account in this mode or alternative payout). Otherwise payment would hit platform and Digger gets nothing.
    if (!useAlternativePayoutSaved && !connectAccountIdSaved) {
      const hasOtherMode = isLive ? !!diggerProfileSaved?.stripe_connect_account_id : !!(diggerProfileSaved as any)?.stripe_connect_account_id_live;
      const errMsg = hasOtherMode
        ? (isLive
            ? "The professional connected payouts for Sandbox only. Switch the platform to Sandbox (Admin → Stripe mode) to pay them, or ask them to connect for Live. You can also use Approve & pay (Checkout)."
            : "The professional connected payouts for Live only. Switch the platform to Live (Admin → Stripe mode) to pay them, or ask them to connect again with the platform in Sandbox. You can also use Approve & pay (Checkout).")
        : (isLive
            ? "The professional hasn't set up payouts for live payments yet. Ask them to complete \"Get paid\" in their account (live mode), or use \"Approve & pay (Checkout)\" to pay."
            : "The professional hasn't set up payouts for sandbox yet. Ask them to complete \"Get paid\" in their account (with sandbox mode on), or use \"Approve & pay (Checkout)\" to pay—the professional will then receive the payment.");
      logStep("Saved card rejected: Digger has no payout account in this mode", { isLive, diggerId: contract.digger_id, hasOtherMode });
      return new Response(
        JSON.stringify({ error: errMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
    if (!useAlternativePayoutSaved && connectAccountIdSaved && transferFromThisPaymentCents > 0) {
      paymentIntentParams.transfer_data = {
        destination: connectAccountIdSaved,
        amount: transferFromThisPaymentCents,
      };
      logStep("Using transfer_data (milestone payout only; 7% from platform)", { transferFromThisPaymentCents });
    } else if (useAlternativePayoutSaved) {
      logStep("Alternative payout (PayPal etc.); charging to platform only", {});
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

    // Alternative payout: charge is on platform. PayPal -> paypal-payout; Payoneer/Wise -> mark paid and create transaction (manual payout later).
    if (useAlternativePayoutSaved && (diggerProfileSaved as any)?.payout_provider === "paypal") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const payoutUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/paypal-payout`;
      try {
        const payoutRes = await fetch(payoutUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRole}`,
          },
          body: JSON.stringify({ milestonePaymentId, stripePaymentIntentId: paymentIntent.id }),
        });
        const payoutData = (await payoutRes.json()) as { success?: boolean; error?: string; alreadyCompleted?: boolean };
        if (!payoutRes.ok || (!payoutData.success && !payoutData.alreadyCompleted)) {
          const errMsg = payoutData?.error ?? `PayPal payout failed: ${payoutRes.status}`;
          logStep("PayPal payout failed", { error: errMsg });
          return new Response(
            JSON.stringify({ error: errMsg }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
          );
        }
        logStep("PayPal payout completed (saved PM flow)", { milestonePaymentId });
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment successful. The Digger will receive the payment via PayPal.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        logStep("Failed to invoke paypal-payout", { error: msg });
        return new Response(
          JSON.stringify({ error: `Payout delivery failed: ${msg}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
        );
      }
    }

    if (useAlternativePayoutSaved && ((diggerProfileSaved as any)?.payout_provider === "payoneer" || (diggerProfileSaved as any)?.payout_provider === "wise")) {
      await supabaseAdmin
        .from("milestone_payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
          released_at: new Date().toISOString(),
        })
        .eq("id", milestonePaymentId);
      let bidIdAlt = (await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single()).data?.awarded_bid_id;
      if (!bidIdAlt) {
        const bidRow = await supabaseAdmin
          .from("bids")
          .select("id")
          .eq("gig_id", contract.gig_id)
          .eq("digger_id", contract.digger_id)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle();
        bidIdAlt = bidRow.data?.id ?? null;
      }
      await supabaseAdmin.from("transactions").insert({
        gig_id: contract.gig_id,
        bid_id: bidIdAlt ?? null,
        consumer_id: contract.consumer_id,
        digger_id: contract.digger_id,
        total_amount: totalChargeCents / 100,
        commission_rate: TRANSACTION_FEE_PERCENT / 100,
        commission_amount: transactionFeeCents / 100,
        digger_payout: diggerPayoutCents / 100,
        status: "completed",
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
        escrow_contract_id: milestone.escrow_contract_id,
        milestone_payment_id: milestonePaymentId,
        is_escrow: false,
      });
      logStep("Payoneer/Wise: milestone marked paid (manual payout)", { milestonePaymentId });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment successful. The professional will receive their payout via Payoneer/Wise (processed by the platform).",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Stripe path: transfer 7% from platform (deposit) to digger if first milestone; update milestone and transaction.
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
