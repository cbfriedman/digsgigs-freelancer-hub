import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-EXTENSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR", { message: "Missing signature or webhook secret" });
    return new Response("Webhook signature missing", { status: 400 });
  }

  try {
    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook event received", { type: event.type, id: event.id });

    // Only process checkout.session.completed events
    if (event.type !== "checkout.session.completed") {
      logStep("Ignoring non-checkout event", { type: event.type });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // Verify this is an extension payment
    if (session.metadata?.type !== "exclusivity_extension") {
      logStep("Not an extension payment", { metadata: session.metadata });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const extensionId = session.metadata.extension_id;
    const queueEntryId = session.metadata.queue_entry_id;

    if (!extensionId || !queueEntryId) {
      throw new Error("Missing extension_id or queue_entry_id in metadata");
    }

    logStep("Processing extension payment", {
      extensionId,
      queueEntryId,
      paymentIntentId: session.payment_intent,
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Update extension payment status
    const { error: updateExtensionError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .update({
        payment_status: "completed",
        stripe_payment_id: session.payment_intent as string,
      })
      .eq("id", extensionId);

    if (updateExtensionError) {
      throw new Error(`Failed to update extension: ${updateExtensionError.message}`);
    }

    logStep("Extension payment confirmed", { extensionId });

    // Get extension details to update queue entry
    const { data: extension, error: extensionError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .select("expires_at")
      .eq("id", extensionId)
      .single();

    if (extensionError || !extension) {
      throw new Error("Failed to fetch extension details");
    }

    // Update queue entry with new expiry time
    const { error: updateQueueError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .update({
        exclusivity_ends_at: extension.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueEntryId);

    if (updateQueueError) {
      throw new Error(`Failed to update queue entry: ${updateQueueError.message}`);
    }

    logStep("Queue entry updated with new expiry", {
      queueEntryId,
      newExpiry: extension.expires_at,
    });

    // Create success notification
    const userId = session.metadata.user_id;
    if (userId) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: userId,
          type: "extension_confirmed",
          title: "Extension Confirmed!",
          message: `Your 24-hour exclusivity extension has been activated. New expiry: ${new Date(extension.expires_at).toLocaleString()}`,
          link: `/my-leads`,
          metadata: {
            extension_id: extensionId,
            queue_entry_id: queueEntryId,
          },
        });

      logStep("Notification created", { userId });
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
