import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnlockCheckoutRequest {
  leadId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { leadId }: UnlockCheckoutRequest = await req.json();

    if (!leadId) {
      throw new Error("leadId is required");
    }

    console.log(`[create-lead-unlock-checkout] User: ${user.id}, Lead: ${leadId}`);

    // Get the user's digger profile
    const { data: diggerProfile, error: profileError } = await serviceSupabase
      .from("digger_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found. You must be a registered Digger to unlock leads.");
    }

    // Check if already unlocked
    const { data: existingUnlock } = await serviceSupabase
      .from("lead_unlocks")
      .select("id")
      .eq("lead_id", leadId)
      .eq("digger_id", diggerProfile.id)
      .single();

    if (existingUnlock) {
      throw new Error("You have already unlocked this lead");
    }

    // Get lead details
    const { data: lead, error: leadError } = await serviceSupabase
      .from("gigs")
      .select("id, title, calculated_price_cents, budget_min, budget_max")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Calculate price (use stored price or calculate)
    let priceCents = lead.calculated_price_cents;
    
    if (!priceCents && lead.budget_min && lead.budget_max) {
      // Calculate 3% of average, $49 cap, no minimum
      const avgBudget = (lead.budget_min + lead.budget_max) / 2;
      priceCents = Math.round(avgBudget * 0.03 * 100);
      priceCents = Math.round(priceCents / 100) * 100; // Round to nearest dollar
      priceCents = Math.min(4900, Math.max(100, priceCents)); // No minimum, $49 cap
    }

    if (!priceCents) {
      priceCents = 100; // Default $1 (no minimum)
    }

    console.log(`[create-lead-unlock-checkout] Price: ${priceCents} cents`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user has a Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://digsandgigs.net";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Lead Unlock: ${lead.title.substring(0, 50)}`,
              description: `Unlock contact information for this lead`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/lead/${leadId}?unlocked=true`,
      cancel_url: `${origin}/lead/${leadId}/unlock?canceled=true`,
      metadata: {
        leadId: leadId,
        diggerId: diggerProfile.id,
        userId: user.id,
        priceCents: priceCents.toString(),
        type: "lead_unlock",
      },
    });

    console.log(`[create-lead-unlock-checkout] Session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[create-lead-unlock-checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
