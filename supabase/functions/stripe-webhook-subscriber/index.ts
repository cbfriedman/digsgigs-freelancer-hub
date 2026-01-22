import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event: Stripe.Event;
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err: any) {
        console.error("[stripe-webhook-subscriber] Signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    console.log(`[stripe-webhook-subscriber] Event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.type !== "subscriber_lead_unlock") {
        console.log("[stripe-webhook-subscriber] Not a subscriber purchase, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { subscriberId, leadId, purchaseId } = metadata;

      console.log(`[stripe-webhook-subscriber] Processing subscriber purchase: ${purchaseId}`);

      // Update purchase record
      const { error: updateError } = await supabase
        .from("subscriber_lead_purchases")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent as string,
          purchased_at: new Date().toISOString(),
        })
        .eq("id", purchaseId);

      if (updateError) {
        console.error("[stripe-webhook-subscriber] Failed to update purchase:", updateError);
        throw updateError;
      }

      // Get subscriber and lead details for email
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("email, full_name")
        .eq("id", subscriberId)
        .single();

      const { data: lead } = await supabase
        .from("gigs")
        .select("title, description, consumer_id, contact_name, contact_email, contact_phone, budget_min, budget_max")
        .eq("id", leadId)
        .single();

      if (subscriber && lead && resend) {
        // Get consumer contact info if not directly on lead
        let contactName = lead.contact_name;
        let contactEmail = lead.contact_email;
        let contactPhone = lead.contact_phone;

        if (!contactEmail && lead.consumer_id) {
          const { data: consumer } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", lead.consumer_id)
            .single();

          if (consumer) {
            contactName = contactName || consumer.full_name;
            contactEmail = consumer.email;
            contactPhone = contactPhone || consumer.phone;
          }
        }

        const baseUrl = Deno.env.get("SITE_URL") || "https://digsandgigs.net";

        // Send email with lead contact info
        await resend.emails.send({
          from: "Digs & Gigs <leads@digsandgigs.net>",
          to: [subscriber.email],
          subject: `🎉 Lead Unlocked: ${lead.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #5b21b6;">🎉 Lead Unlocked!</h1>
              
              <p>Hi ${subscriber.full_name || "there"},</p>
              
              <p>Great news! You've successfully unlocked the contact information for:</p>
              
              <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px 0; color: #111827;">${lead.title}</h2>
                
                <div style="background: white; border-radius: 8px; padding: 16px; margin-top: 16px;">
                  <h3 style="margin: 0 0 12px 0; color: #5b21b6;">Client Contact Information</h3>
                  ${contactName ? `<p style="margin: 4px 0;"><strong>Name:</strong> ${contactName}</p>` : ''}
                  ${contactEmail ? `<p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></p>` : ''}
                  ${contactPhone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> <a href="tel:${contactPhone}">${contactPhone}</a></p>` : ''}
                </div>
                
                ${lead.description ? `<p style="margin-top: 16px;"><strong>Project Details:</strong><br>${lead.description.substring(0, 300)}${lead.description.length > 300 ? '...' : ''}</p>` : ''}
                
                ${lead.budget_min && lead.budget_max ? `<p><strong>Budget:</strong> $${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}</p>` : ''}
              </div>
              
              <h3>Tips for Success:</h3>
              <ul>
                <li>Reach out within 24 hours for the best response rate</li>
                <li>Reference their specific project needs</li>
                <li>Be professional and concise</li>
              </ul>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0;"><strong>Want more features?</strong></p>
                <p style="margin: 8px 0 0 0;">Create a free Digger profile to get listed in our directory, build your reputation, and attract clients directly.</p>
                <a href="${baseUrl}/register?mode=signup&type=digger" style="display: inline-block; background: #5b21b6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 12px;">Create Your Profile</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                Good luck with this project!<br>
                The Digs & Gigs Team
              </p>
            </body>
            </html>
          `,
        });

        console.log(`[stripe-webhook-subscriber] Sent unlock email to ${subscriber.email}`);
      }

      console.log(`[stripe-webhook-subscriber] Purchase completed: ${purchaseId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[stripe-webhook-subscriber] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});