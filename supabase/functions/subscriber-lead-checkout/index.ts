import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriberCheckoutRequest {
  subscriberId: string;
  leadId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { subscriberId, leadId }: SubscriberCheckoutRequest = await req.json();

    if (!subscriberId || !leadId) {
      throw new Error("subscriberId and leadId are required");
    }

    console.log(`[subscriber-lead-checkout] Subscriber: ${subscriberId}, Lead: ${leadId}`);

    // Get the subscriber
    const { data: subscriber, error: subscriberError } = await supabase
      .from("subscribers")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", subscriberId)
      .single();

    if (subscriberError || !subscriber) {
      throw new Error("Subscriber not found");
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("subscriber_lead_purchases")
      .select("id")
      .eq("subscriber_id", subscriberId)
      .eq("gig_id", leadId)
      .single();

    if (existingPurchase) {
      throw new Error("You have already purchased this lead");
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("gigs")
      .select("id, title, calculated_price_cents, budget_min, budget_max")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Calculate price
    let priceCents = lead.calculated_price_cents;
    
    if (!priceCents && lead.budget_min && lead.budget_max) {
      const avgBudget = (lead.budget_min + lead.budget_max) / 2;
      priceCents = Math.round(avgBudget * 0.03 * 100);
      priceCents = Math.round(priceCents / 100) * 100;
      priceCents = Math.min(4900, Math.max(900, priceCents)); // $9-$49 range
    }

    if (!priceCents) {
      priceCents = 900; // Default $9
    }

    console.log(`[subscriber-lead-checkout] Price: ${priceCents} cents`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer
    let customerId = subscriber.stripe_customer_id;
    
    if (!customerId) {
      const customers = await stripe.customers.list({ email: subscriber.email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: subscriber.email,
          name: subscriber.full_name || undefined,
          metadata: {
            subscriber_id: subscriberId,
            type: "subscriber",
          },
        });
        customerId = customer.id;
      }

      // Save customer ID
      await supabase
        .from("subscribers")
        .update({ stripe_customer_id: customerId })
        .eq("id", subscriberId);
    }

    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("subscriber_lead_purchases")
      .insert({
        subscriber_id: subscriberId,
        gig_id: leadId,
        purchase_price_cents: priceCents,
        status: "pending",
      })
      .select("id")
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase record: ${purchaseError.message}`);
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://digsandgigs.net";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Lead: ${lead.title.substring(0, 50)}`,
              description: "Unlock client contact information for this project",
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/lead/${leadId}?sub=${subscriberId}&unlocked=true`,
      cancel_url: `${origin}/lead/${leadId}/unlock?sub=${subscriberId}&canceled=true`,
      metadata: {
        leadId: leadId,
        subscriberId: subscriberId,
        purchaseId: purchase.id,
        priceCents: priceCents.toString(),
        type: "subscriber_lead_unlock",
      },
    });

    // Update purchase with session ID
    await supabase
      .from("subscriber_lead_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

    console.log(`[subscriber-lead-checkout] Session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[subscriber-lead-checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});