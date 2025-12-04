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

/**
 * Round up to nearest $0.50 or whole number
 */
const roundUpToHalf = (value: number): number => {
  return Math.ceil(value * 2) / 2;
};

/**
 * CPC-based pricing calculation
 * Formula:
 * - Non-Exclusive Unconfirmed: 25% of CPC
 * - Non-Exclusive Confirmed: 30% of CPC
 * - Semi-Exclusive: 50% of CPC
 * - 24-Hour Exclusive: 90% of CPC
 */
const calculateLeadCost = (
  cpc: number,
  exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h',
  isConfirmed: boolean = false
): number => {
  let price: number;
  
  if (exclusivityType === 'exclusive-24h') {
    // 24-Hr Exclusive: 90% of CPC
    price = cpc * 0.90;
  } else if (exclusivityType === 'semi-exclusive') {
    // Semi-Exclusive: 50% of CPC
    price = cpc * 0.50;
  } else if (isConfirmed) {
    // Non-exclusive Confirmed: 30% of CPC
    price = cpc * 0.30;
  } else {
    // Non-exclusive Unconfirmed: 25% of CPC
    price = cpc * 0.25;
  }
  
  return roundUpToHalf(price);
};

// Fallback static pricing when no CPC data available
const FALLBACK_PRICING: Record<string, { nonExclusive: number; semiExclusive: number; exclusive24h: number }> = {
  'low-value': { nonExclusive: 9.50, semiExclusive: 19.00, exclusive24h: 34.00 },
  'mid-value': { nonExclusive: 18.50, semiExclusive: 37.00, exclusive24h: 67.00 },
  'high-value': { nonExclusive: 31.00, semiExclusive: 62.00, exclusive24h: 112.00 },
};

// Industry category mapping for fallback
const getIndustryCategory = (profession: string): 'low-value' | 'mid-value' | 'high-value' => {
  const lowValue = ['Cleaning', 'Handyman', 'Pet Care', 'Tutoring', 'Moving', 'Event Planning', 'Catering', 'Beauty'];
  const highValue = ['Legal', 'Insurance', 'Financial', 'Real Estate', 'Medical', 'Dental', 'Accounting', 'Consulting', 'Architecture', 'Engineering'];
  
  if (lowValue.some(cat => profession.includes(cat))) return 'low-value';
  if (highValue.some(cat => profession.includes(cat))) return 'high-value';
  return 'mid-value';
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

    const { diggerId, gigId, pricingModel, exclusivityType = 'non-exclusive', isConfirmed = false } = await req.json();
    
    if (!diggerId || !gigId || !pricingModel) {
      throw new Error("Missing required fields: diggerId, gigId, or pricingModel");
    }

    logStep("Request data", { diggerId, gigId, pricingModel, exclusivityType, isConfirmed });

    // Get digger profile
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from('digger_profiles')
      .select('monthly_lead_count, user_id, profession, keywords')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    // Verify the authenticated user is the digger
    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized: You can only purchase leads for your own profile");
    }

    logStep("Digger profile found", { profession: diggerProfile.profession });

    // Get gig details
    const { data: gig, error: gigError } = await supabaseClient
      .from('gigs')
      .select('consumer_id, title, is_confirmed_lead')
      .eq('id', gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    logStep("Gig found", { consumerId: gig.consumer_id, title: gig.title });

    // Calculate lead cost using CPC-based pricing
    const profession = diggerProfile.profession || 'General Contracting';
    const confirmed = isConfirmed || gig.is_confirmed_lead || false;
    
    // For now, use fallback pricing based on industry category
    // In production, you would look up the CPC from your keyword database
    const industryCategory = getIndustryCategory(profession);
    const fallbackPricing = FALLBACK_PRICING[industryCategory];
    
    let leadCost: number;
    if (exclusivityType === 'exclusive-24h') {
      leadCost = fallbackPricing.exclusive24h;
    } else if (exclusivityType === 'semi-exclusive') {
      leadCost = fallbackPricing.semiExclusive;
    } else {
      // Non-exclusive: add 20% premium for confirmed leads (30% vs 25%)
      leadCost = confirmed 
        ? roundUpToHalf(fallbackPricing.nonExclusive * 1.20)
        : fallbackPricing.nonExclusive;
    }

    logStep("Lead cost calculated", { leadCost, exclusivityType, confirmed, profession, industryCategory });

    // Create lead purchase record
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from('lead_purchases')
      .insert({
        digger_id: diggerId,
        gig_id: gigId,
        consumer_id: gig.consumer_id,
        purchase_price: leadCost,
        amount_paid: leadCost,
        exclusivity_type: exclusivityType,
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

    // Build product description
    const exclusivityLabel = exclusivityType === 'exclusive-24h' 
      ? '24-Hour Exclusive' 
      : exclusivityType === 'semi-exclusive'
      ? 'Semi-Exclusive'
      : confirmed ? 'Non-Exclusive Confirmed' : 'Non-Exclusive';

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
              description: `${exclusivityLabel} Lead`,
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
        exclusivity_type: exclusivityType,
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
