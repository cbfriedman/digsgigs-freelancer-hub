import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EXTENSION-CHECKOUT] ${step}${detailsStr}`);
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

    const { queueEntryId, extensionNumber } = await req.json();
    
    if (!queueEntryId || !extensionNumber) {
      throw new Error("queueEntryId and extensionNumber are required");
    }

    logStep("Processing extension checkout", { queueEntryId, extensionNumber, userId: user.id });

    // Get the queue entry details
    const { data: queueEntry, error: queueError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .select(`
        *,
        gig:gigs!inner(title),
        digger:digger_profiles!inner(user_id)
      `)
      .eq("id", queueEntryId)
      .eq("status", "active")
      .single();

    if (queueError || !queueEntry) {
      throw new Error("Queue entry not found or not active");
    }

    // Verify the user owns this queue entry
    if (queueEntry.digger.user_id !== user.id) {
      throw new Error("Unauthorized - not your lead");
    }

    // Calculate extension cost (33% premium)
    const extensionCost = queueEntry.base_price * 1.33;
    
    // Calculate new expiry time
    const currentExpiry = new Date(queueEntry.exclusivity_ends_at);
    const newExpiry = new Date(currentExpiry.getTime() + 24 * 60 * 60 * 1000);

    logStep("Extension calculated", { 
      extensionCost,
      currentExpiry,
      newExpiry,
      gigTitle: queueEntry.gig.title 
    });

    // Create the extension record
    const { data: extension, error: extensionInsertError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .insert({
        queue_entry_id: queueEntryId,
        extension_number: extensionNumber,
        extension_cost: extensionCost,
        expires_at: newExpiry.toISOString(),
        payment_status: "pending",
      })
      .select()
      .single();

    if (extensionInsertError || !extension) {
      throw new Error("Failed to create extension record");
    }

    logStep("Extension record created", { extensionId: extension.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile?.email) {
      throw new Error("User email not found");
    }

    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://digsandgigs.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `24-Hour Exclusivity Extension #${extensionNumber}`,
              description: `Extend exclusive access to "${queueEntry.gig.title}" for 24 hours`,
            },
            unit_amount: Math.round(extensionCost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/my-leads?extension_success=true`,
      cancel_url: `${origin}/my-leads?extension_canceled=true`,
      metadata: {
        extension_id: extension.id,
        queue_entry_id: queueEntryId,
        user_id: user.id,
        type: "exclusivity_extension",
      },
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
