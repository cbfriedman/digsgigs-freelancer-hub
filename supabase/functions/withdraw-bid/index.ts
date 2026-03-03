import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body = (await req.json()) as { bidId: string; origin?: string };
    const { bidId, origin: originFromBody } = body;

    if (!bidId) {
      throw new Error("Bid ID is required");
    }

    // Base URL for redirect: client-provided origin is most reliable (avoids null when header missing)
    const baseUrl = (originFromBody || req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://digsandgigs.net").replace(/\/$/, "");

    // Get bid details and verify it's accepted
    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select(`
        *,
        digger:digger_profiles!inner(id, user_id, handle)
      `)
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error("Bid not found");
    }

    // Verify user is the bid owner
    if (bid.digger.user_id !== user.id) {
      throw new Error("Unauthorized: You can only withdraw your own bids");
    }

    // Verify bid is in accepted status
    if (bid.status !== "accepted") {
      throw new Error("Only accepted bids can be withdrawn with a penalty");
    }

    // Check if already withdrawn
    if (bid.withdrawn_at) {
      throw new Error("Bid has already been withdrawn");
    }

    // Calculate 25% penalty
    const penaltyAmount = Number(bid.amount) * 0.25;

    // Create penalty record
    const { data: penalty, error: penaltyError } = await supabaseClient
      .from("withdrawal_penalties")
      .insert({
        bid_id: bidId,
        digger_id: bid.digger_id,
        penalty_amount: penaltyAmount,
        status: "pending"
      })
      .select()
      .single();

    if (penaltyError) {
      throw new Error(`Failed to create penalty record: ${penaltyError.message}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session for penalty payment (card or US bank)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card", "us_bank_account"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(penaltyAmount * 100), // Convert to cents
            product_data: {
              name: "Bid Withdrawal Penalty",
              description: `25% penalty for withdrawing from accepted bid ($${bid.amount})`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        penalty_id: penalty.id,
        bid_id: bidId,
        digger_id: bid.digger_id,
      },
      success_url: `${baseUrl}/my-bids?withdrawal=success&penalty_id=${penalty.id}`,
      cancel_url: `${baseUrl}/my-bids?withdrawal=cancelled`,
    });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        penaltyAmount,
        penaltyId: penalty.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in withdraw-bid:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});