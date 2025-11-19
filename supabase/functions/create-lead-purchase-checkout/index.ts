import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LEAD-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    const { diggerId, gigId, pricingModel } = await req.json();
    
    if (!diggerId || !gigId || !pricingModel) {
      throw new Error("Missing required fields: diggerId, gigId, or pricingModel");
    }

    logStep("Request data", { diggerId, gigId, pricingModel });

    // Get digger profile to determine current tier based on monthly lead count
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from('digger_profiles')
      .select('monthly_lead_count, user_id, profession')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    // Verify the authenticated user is the digger
    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized: You can only purchase leads for your own profile");
    }

    // Determine current tier based on lead count (prospective pricing)
    const leadCount = diggerProfile.monthly_lead_count || 0;
    let tier: 'free' | 'pro' | 'premium';
    if (leadCount < 10) {
      tier = 'free';
    } else if (leadCount < 50) {
      tier = 'pro';
    } else {
      tier = 'premium';
    }

    logStep("Digger profile found", { leadCount, tier });

    // Get gig details to get consumer_id
    const { data: gig, error: gigError } = await supabaseClient
      .from('gigs')
      .select('consumer_id, title')
      .eq('id', gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    logStep("Gig found", { consumerId: gig.consumer_id });

    // Calculate lead cost based on tier and industry
    // Pricing structure:
    // Free tier (leads 1-10): 3x Google CPC
    // Pro tier (leads 11-50): 2x Google CPC
    // Premium tier (leads 51+): 1x Google CPC
    const profession = diggerProfile.profession || 'General Contracting';
    
    // Industry-specific pricing (from pricing config)
    const INDUSTRY_PRICING: Record<string, { free: number; pro: number; premium: number }> = {
      'low-value': { free: 24, pro: 16, premium: 8 },
      'mid-value': { free: 120, pro: 80, premium: 40 },
      'high-value': { free: 750, pro: 500, premium: 250 }
    };
    
    // Determine industry category (simplified - you may want to import from pricing config)
    const getIndustryCategory = (prof: string): 'low-value' | 'mid-value' | 'high-value' => {
      const lowValue = ['Cleaning', 'Handyman', 'Pet Care', 'Tutoring', 'Moving', 'Event Planning', 'Catering', 'Beauty'];
      const highValue = ['Legal', 'Insurance', 'Financial', 'Real Estate', 'Medical', 'Dental', 'Accounting', 'Consulting', 'Architecture'];
      
      if (lowValue.some(cat => prof.includes(cat))) return 'low-value';
      if (highValue.some(cat => prof.includes(cat))) return 'high-value';
      return 'mid-value';
    };
    
    const industryCategory = getIndustryCategory(profession);
    const leadCost = INDUSTRY_PRICING[industryCategory][tier];

    logStep("Lead cost calculated", { leadCost, tier, pricingModel, profession, industryCategory });

    // Create lead purchase record
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .insert({
        digger_id: diggerId,
        gig_id: gigId,
        consumer_id: gig.consumer_id,
        purchase_price: leadCost,
        amount_paid: leadCost,
        status: leadCost === 0 ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Error creating lead purchase", { error: purchaseError });
      throw new Error(`Failed to create lead purchase: ${purchaseError.message}`);
    }

    logStep("Lead purchase created", { leadPurchaseId: leadPurchase.id });

    // If lead cost is 0, return success immediately
    if (leadCost === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        leadPurchaseId: leadPurchase.id,
        message: "Lead access granted at no cost"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Lead Purchase - ${gig.title}`,
              description: `${pricingModel === 'fixed' ? 'Fixed Price' : pricingModel === 'hourly' ? 'Hourly Rate' : 'Free Estimate'} Lead`,
            },
            unit_amount: Math.round(leadCost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/gig/${gigId}?lead_purchased=true`,
      cancel_url: `${req.headers.get("origin")}/gig/${gigId}?lead_purchase_cancelled=true`,
      metadata: {
        lead_purchase_id: leadPurchase.id,
        digger_id: diggerId,
        gig_id: gigId,
        pricing_model: pricingModel,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      leadPurchaseId: leadPurchase.id
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
