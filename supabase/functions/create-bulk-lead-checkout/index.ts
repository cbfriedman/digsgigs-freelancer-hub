import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BULK-LEAD-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { selections, totalAmount, diggerProfileId, discountInfo } = await req.json();
    
    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      throw new Error("No lead selections provided");
    }
    
    if (!diggerProfileId) {
      throw new Error("Digger profile ID is required");
    }

    logStep("Lead selections received", { count: selections.length, totalAmount, diggerProfileId, discountInfo });

    // Calculate discount
    const originalTotal = selections.reduce((sum: number, s: any) => sum + s.subtotal, 0);
    const firstTier = Math.min(originalTotal, 1000);
    const secondTier = Math.max(0, originalTotal - 1000);
    const discountOnFirstThousand = firstTier * 0.10;
    const discountOnExcess = secondTier * 0.20;
    const totalDiscount = discountOnFirstThousand + discountOnExcess;
    const finalTotal = originalTotal - totalDiscount;

    logStep("Discount calculation", { 
      originalTotal, 
      discountOnFirstThousand, 
      discountOnExcess, 
      totalDiscount, 
      finalTotal 
    });

    // Store selections in pending_lead_purchases table (bypasses Stripe 500-char metadata limit)
    const { data: pendingPurchase, error: pendingError } = await supabaseAdmin
      .from('pending_lead_purchases')
      .insert({
        user_id: user.id,
        digger_profile_id: diggerProfileId,
        selections: selections,
        original_amount: originalTotal,
        discount_amount: totalDiscount,
        final_amount: finalTotal,
        status: 'pending'
      })
      .select()
      .single();

    if (pendingError) {
      logStep("Error creating pending purchase", { error: pendingError });
      throw new Error("Failed to create pending purchase record");
    }

    logStep("Pending purchase created", { pendingPurchaseId: pendingPurchase.id });

    // Initialize Stripe for payment
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Helper to get exclusivity label
    const getExclusivityLabel = (exclusivity: string, isConfirmed: boolean): string => {
      if (exclusivity === 'exclusive-24h') return '24-Hr Exclusive';
      if (exclusivity === 'semi-exclusive') return 'Semi-Exclusive';
      if (isConfirmed) return 'Confirmed';
      return 'Non-Exclusive';
    };

    // Calculate discount ratio for proportional distribution
    const discountRatio = finalTotal / originalTotal;

    // Create line items for each lead selection with actual per-lead prices
    const lineItems = selections.map((selection: any) => {
      // Use the pre-calculated pricePerLead, apply discount ratio
      const discountedPricePerLead = Math.round(selection.pricePerLead * discountRatio * 100); // in cents
      const exclusivityLabel = getExclusivityLabel(selection.exclusivity, selection.isConfirmed);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${selection.keyword} Lead Credits`,
            description: `${exclusivityLabel} - ${selection.quantity} credit${selection.quantity !== 1 ? 's' : ''} @ $${selection.pricePerLead.toFixed(2)}/lead`,
          },
          unit_amount: discountedPricePerLead,
        },
        quantity: selection.quantity,
      };
    });

    // Create Stripe checkout session with pending_purchase_id reference
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/checkout-success?type=lead_credits`,
      cancel_url: `${req.headers.get("origin")}/keyword-summary?profileId=${diggerProfileId}&cancelled=true`,
      metadata: {
        user_id: user.id,
        digger_profile_id: diggerProfileId,
        purchase_type: "keyword_bulk",
        pending_purchase_id: pendingPurchase.id,
      },
    });

    // Update pending purchase with stripe session ID
    await supabaseAdmin
      .from('pending_lead_purchases')
      .update({ stripe_session_id: session.id })
      .eq('id', pendingPurchase.id);

    logStep("Checkout session created", { sessionId: session.id, pendingPurchaseId: pendingPurchase.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});