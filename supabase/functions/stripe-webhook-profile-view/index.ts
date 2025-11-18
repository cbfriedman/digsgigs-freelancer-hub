import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEBHOOK-PROFILE-VIEW] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_PROFILE_VIEW");

  if (!signature || !webhookSecret) {
    logStep("Missing signature or webhook secret");
    return new Response("Webhook Error: Missing signature or secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    logStep("Webhook event received", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.type !== "profile_view") {
        logStep("Not a profile view payment, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { consumer_id, digger_id, total_charge } = session.metadata;

      logStep("Processing profile view payment", { 
        consumerId: consumer_id, 
        diggerId: digger_id,
        totalCharge: total_charge 
      });

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Record the profile view
      const { error: viewError } = await supabaseAdmin
        .from("profile_views")
        .insert({
          consumer_id,
          digger_id,
          amount_charged: parseFloat(total_charge),
        });

      if (viewError) {
        logStep("Error recording profile view", { error: viewError });
        throw viewError;
      }

      logStep("Profile view recorded successfully");

      // Create notification for digger
      const { data: diggerProfile } = await supabaseAdmin
        .from("digger_profiles")
        .select("user_id, business_name")
        .eq("id", digger_id)
        .single();

      if (diggerProfile) {
        await supabaseAdmin.rpc("create_notification", {
          p_user_id: diggerProfile.user_id,
          p_type: "profile_view",
          p_title: "Someone Viewed Your Profile",
          p_message: `A client viewed your contact information and paid to access your profile.`,
          p_link: `/my-profiles`,
        });
        logStep("Notification sent to digger");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStep("Webhook error", { error: errorMessage });
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
});