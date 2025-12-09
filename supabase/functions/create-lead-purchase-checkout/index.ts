import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (value: any): value is string => {
  return typeof value === 'string' && UUID_REGEX.test(value);
};
const isValidEnum = <T extends string>(value: any, allowedValues: readonly T[]): value is T => {
  return typeof value === 'string' && allowedValues.includes(value as T);
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
 * Bark-based pricing multipliers
 * Formula:
 * - Non-Exclusive Unconfirmed: Bark × 0.90 (5% conversion)
 * - Non-Exclusive Confirmed: Bark × 1.25 (10% conversion)
 * - Semi-Exclusive: Bark × 2.00 (20% conversion)
 * - 24-Hour Exclusive: Bark × 4.00 (50% conversion)
 */
const BARK_PRICING_MULTIPLIERS = {
  nonExclusiveUnconfirmed: 0.90,
  nonExclusiveConfirmed: 1.25,
  semiExclusive: 2.00,
  exclusive24h: 4.00,
};

/**
 * Calculate lead cost from Bark base price
 */
const calculateLeadCost = (
  barkPrice: number,
  exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h',
  isConfirmed: boolean = false
): number => {
  let price: number;
  
  if (exclusivityType === 'exclusive-24h') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.exclusive24h;
  } else if (exclusivityType === 'semi-exclusive') {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.semiExclusive;
  } else if (isConfirmed) {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveConfirmed;
  } else {
    price = barkPrice * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed;
  }
  
  return roundUpToHalf(price);
};

// Fallback Bark prices by industry category
const FALLBACK_BARK_PRICES: Record<string, number> = {
  'low-value': 8.00,
  'mid-value': 15.00,
  'high-value': 25.00,
};

// Fallback static pricing calculated from Bark base prices
const FALLBACK_PRICING: Record<string, { nonExclusive: number; semiExclusive: number; exclusive24h: number }> = {
  'low-value': { 
    nonExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['low-value'] * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed),
    semiExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['low-value'] * BARK_PRICING_MULTIPLIERS.semiExclusive),
    exclusive24h: roundUpToHalf(FALLBACK_BARK_PRICES['low-value'] * BARK_PRICING_MULTIPLIERS.exclusive24h)
  },
  'mid-value': { 
    nonExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['mid-value'] * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed),
    semiExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['mid-value'] * BARK_PRICING_MULTIPLIERS.semiExclusive),
    exclusive24h: roundUpToHalf(FALLBACK_BARK_PRICES['mid-value'] * BARK_PRICING_MULTIPLIERS.exclusive24h)
  },
  'high-value': { 
    nonExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['high-value'] * BARK_PRICING_MULTIPLIERS.nonExclusiveUnconfirmed),
    semiExclusive: roundUpToHalf(FALLBACK_BARK_PRICES['high-value'] * BARK_PRICING_MULTIPLIERS.semiExclusive),
    exclusive24h: roundUpToHalf(FALLBACK_BARK_PRICES['high-value'] * BARK_PRICING_MULTIPLIERS.exclusive24h)
  },
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
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
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

    const requestBody = await req.json();
    const { diggerId, gigId, pricingModel, exclusivityType = 'non-exclusive', isConfirmed = false } = requestBody;
    
    // SECURITY: Input validation
    if (!diggerId || !gigId || !pricingModel) {
      throw new Error("Missing required fields: diggerId, gigId, or pricingModel");
    }

    // Validate UUIDs
    if (!isValidUUID(diggerId)) {
      return new Response(
        JSON.stringify({ error: "Invalid diggerId format. Must be a valid UUID." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidUUID(gigId)) {
      return new Response(
        JSON.stringify({ error: "Invalid gigId format. Must be a valid UUID." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate exclusivity type
    const validExclusivityTypes = ['non-exclusive', 'semi-exclusive', 'exclusive-24h'] as const;
    if (!isValidEnum(exclusivityType, validExclusivityTypes)) {
      return new Response(
        JSON.stringify({ error: `Invalid exclusivityType. Must be one of: ${validExclusivityTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate pricing model
    const validPricingModels = ['fixed', 'hourly', 'both', 'free_estimate'] as const;
    if (!isValidEnum(pricingModel, validPricingModels)) {
      return new Response(
        JSON.stringify({ error: `Invalid pricingModel. Must be one of: ${validPricingModels.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate isConfirmed is boolean
    if (typeof isConfirmed !== 'boolean') {
      return new Response(
        JSON.stringify({ error: "Invalid isConfirmed. Must be a boolean." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Request data validated", { diggerId, gigId, pricingModel, exclusivityType, isConfirmed });

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

    // ============ EXCLUSIVITY ENFORCEMENT ============
    
    // Check if this is an exclusive lead purchase
    if (exclusivityType === 'exclusive-24h') {
      // Check if another digger already has an active exclusive purchase for this gig
      const { data: existingExclusive, error: exclusiveCheckError } = await supabaseClient
        .from('lead_purchases')
        .select('id, digger_id')
        .eq('gig_id', gigId)
        .eq('exclusivity_type', 'exclusive-24h')
        .eq('status', 'completed')
        .neq('digger_id', diggerId)
        .limit(1);
      
      if (exclusiveCheckError) {
        logStep("Error checking exclusive purchases", { error: exclusiveCheckError });
      }
      
      if (existingExclusive && existingExclusive.length > 0) {
        logStep("Exclusive lead already purchased by another digger", { existingPurchase: existingExclusive[0] });
        throw new Error("This lead has already been purchased exclusively by another service provider. Please choose a different lead or exclusivity type.");
      }
      
      // Also check lead_exclusivity_queue for active exclusive entries
      const { data: existingQueueExclusive, error: queueCheckError } = await supabaseClient
        .from('lead_exclusivity_queue')
        .select('id, digger_id, status')
        .eq('gig_id', gigId)
        .eq('exclusivity_type', 'exclusive')
        .in('status', ['active', 'pending'])
        .neq('digger_id', diggerId)
        .limit(1);
      
      if (queueCheckError) {
        logStep("Error checking exclusivity queue", { error: queueCheckError });
      }
      
      if (existingQueueExclusive && existingQueueExclusive.length > 0) {
        logStep("Exclusive queue entry exists for another digger", { existingQueue: existingQueueExclusive[0] });
        throw new Error("This lead is currently under exclusive access by another service provider. Please try again later or choose a different exclusivity type.");
      }
    }
    
    // Check semi-exclusive 4-digger limit
    if (exclusivityType === 'semi-exclusive') {
      const { data: existingSemiExclusive, error: semiCheckError } = await supabaseClient
        .from('lead_purchases')
        .select('id, digger_id')
        .eq('gig_id', gigId)
        .eq('exclusivity_type', 'semi-exclusive')
        .eq('status', 'completed');
      
      if (semiCheckError) {
        logStep("Error checking semi-exclusive purchases", { error: semiCheckError });
      }
      
      const semiExclusiveCount = existingSemiExclusive?.length || 0;
      const MAX_SEMI_EXCLUSIVE = 4;
      
      if (semiExclusiveCount >= MAX_SEMI_EXCLUSIVE) {
        logStep("Semi-exclusive limit reached", { count: semiExclusiveCount, max: MAX_SEMI_EXCLUSIVE });
        throw new Error(`This lead has reached the maximum of ${MAX_SEMI_EXCLUSIVE} semi-exclusive purchases. Please choose Non-Exclusive instead.`);
      }
      
      // Check if this digger already has a semi-exclusive purchase for this gig
      const alreadyHasSemiExclusive = existingSemiExclusive?.some(p => p.digger_id === diggerId);
      if (alreadyHasSemiExclusive) {
        logStep("Digger already has semi-exclusive for this gig");
        throw new Error("You already have a semi-exclusive purchase for this lead.");
      }
    }
    
    // ============ END EXCLUSIVITY ENFORCEMENT ============

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