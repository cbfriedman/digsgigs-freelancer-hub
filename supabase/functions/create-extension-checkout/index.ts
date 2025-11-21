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

    const { extensionId } = await req.json();
    
    if (!extensionId) {
      throw new Error("extensionId is required");
    }

    logStep("Processing extension checkout", { extensionId, userId: user.id });

    // Get the extension details
    const { data: extension, error: extensionError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .select(`
        *,
        queue_entry:lead_exclusivity_queue!inner(
          *,
          gig:gigs!inner(title),
          digger:digger_profiles!inner(user_id)
        )
      `)
      .eq("id", extensionId)
      .eq("payment_status", "pending")
      .single();

    if (extensionError || !extension) {
      throw new Error("Extension not found or already paid");
    }

    // Verify the user owns this extension
    if (extension.queue_entry.digger.user_id !== user.id) {
      throw new Error("Unauthorized - not your extension");
    }

    logStep("Extension verified", { 
      extensionCost: extension.extension_cost,
      gigTitle: extension.queue_entry.gig.title 
    });

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
              name: `24-Hour Exclusivity Extension #${extension.extension_number}`,
              description: `Extend exclusive access to "${extension.queue_entry.gig.title}" for 24 hours`,
            },
            unit_amount: Math.round(extension.extension_cost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/my-leads?extension_success=true`,
      cancel_url: `${origin}/my-leads?extension_canceled=true`,
      metadata: {
        extension_id: extensionId,
        queue_entry_id: extension.queue_entry_id,
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
