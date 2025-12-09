import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MATCH-LEADS] ${step}${detailsStr}`);
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
 * Calculate lead price from Bark base price
 */
const calculateLeadPriceFromBark = (
  barkPrice: number,
  exclusivityType: 'exclusive' | 'semi-exclusive' | 'non-exclusive',
  isConfirmed: boolean = false
): number => {
  let price: number;
  
  if (exclusivityType === 'exclusive') {
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

// Fallback Bark prices by industry category when no specific data available
const FALLBACK_BARK_PRICES: Record<string, number> = {
  'low-value': 8.00,    // Average low-value Bark lead
  'mid-value': 15.00,   // Average mid-value Bark lead
  'high-value': 25.00,  // Average high-value Bark lead
};

// Calculate fallback pricing from Bark base prices
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

// Minimum exclusive pricing by lead source
const EXCLUSIVE_MINIMUMS = {
  internet: 80,
  telemarketing: 60
};

const calculateLeadPricing = (
  leadSource: string = 'internet', 
  industryCategory: string = 'mid-value',
  exclusivityType: 'exclusive' | 'semi-exclusive' = 'exclusive',
  barkPrice?: number,
  isConfirmed: boolean = false
) => {
  // If we have Bark price data, use dynamic pricing
  if (barkPrice && barkPrice > 0) {
    const exclusivePrice = calculateLeadPriceFromBark(barkPrice, 'exclusive', false);
    const semiExclusivePrice = calculateLeadPriceFromBark(barkPrice, 'semi-exclusive', false);
    const nonExclusivePrice = calculateLeadPriceFromBark(barkPrice, 'non-exclusive', isConfirmed);
    
    // Apply telemarketing discount (25% off)
    const discount = leadSource === 'telemarketing' ? 0.75 : 1;
    
    let finalExclusive = exclusivePrice * discount;
    let finalSemiExclusive = semiExclusivePrice * discount;
    
    // Apply minimum pricing for exclusive only
    if (exclusivityType === 'exclusive') {
      const minimum = leadSource === 'telemarketing' 
        ? EXCLUSIVE_MINIMUMS.telemarketing 
        : EXCLUSIVE_MINIMUMS.internet;
      finalExclusive = Math.max(finalExclusive, minimum);
    }
    
    return {
      nonExclusive: nonExclusivePrice,
      semiExclusive: roundUpToHalf(finalSemiExclusive),
      exclusive24h: roundUpToHalf(finalExclusive)
    };
  }
  
  // Fallback to static pricing
  const pricing = FALLBACK_PRICING[industryCategory] || FALLBACK_PRICING['mid-value'];
  
  let exclusivePrice = pricing.exclusive24h;
  let semiExclusivePrice = pricing.semiExclusive;
  
  // Apply telemarketing discount (25% off = multiply by 0.75)
  if (leadSource === 'telemarketing') {
    exclusivePrice = pricing.exclusive24h * 0.75;
    semiExclusivePrice = pricing.semiExclusive * 0.75;
  }
  
  // Apply minimum pricing for exclusive only
  if (exclusivityType === 'exclusive') {
    const minimum = leadSource === 'telemarketing' 
      ? EXCLUSIVE_MINIMUMS.telemarketing 
      : EXCLUSIVE_MINIMUMS.internet;
    exclusivePrice = Math.max(exclusivePrice, minimum);
  }
  
  return {
    nonExclusive: pricing.nonExclusive,
    semiExclusive: roundUpToHalf(semiExclusivePrice),
    exclusive24h: roundUpToHalf(exclusivePrice)
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { gigId, exclusivityType = 'exclusive' } = await req.json();
    
    if (!gigId) {
      throw new Error("gigId is required");
    }
    
    if (exclusivityType !== 'exclusive' && exclusivityType !== 'semi-exclusive') {
      throw new Error("exclusivityType must be 'exclusive' or 'semi-exclusive'");
    }

    logStep("Starting lead matching", { gigId });

    // Get the gig details (SECURITY: Do not expose email addresses)
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("*, profiles!gigs_consumer_id_fkey(id, full_name)")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Gig not found: ${gigError?.message}`);
    }

    logStep("Gig details retrieved", { title: gig.title, leadSource: gig.lead_source });

    // Determine lead source (default to internet if not specified)
    const leadSource = gig.lead_source || 'internet';
    const isConfirmed = gig.is_confirmed_lead || false;
    
    // Calculate pricing (use mid-value as default if category not determined)
    const pricing = calculateLeadPricing(leadSource, 'mid-value', exclusivityType, undefined, isConfirmed);
    
    logStep("Lead pricing calculated", { 
      leadSource,
      exclusivityType,
      isConfirmed,
      nonExclusive: pricing.nonExclusive,
      semiExclusive: pricing.semiExclusive,
      exclusive24h: pricing.exclusive24h
    });

    // Find matching diggers based on NAICS/SIC codes if available
    let matchingDiggers: any[] = [];
    
    if (gig.naics_codes && gig.naics_codes.length > 0) {
      const { data: naicsMatches, error: naicsError } = await supabaseClient
        .from("digger_profiles")
        .select("*")
        .contains("naics_code", gig.naics_codes)
        .eq("registration_status", "complete")
        .gt("monthly_lead_count", 0);

      if (!naicsError && naicsMatches) {
        matchingDiggers = [...matchingDiggers, ...naicsMatches];
      }
    }

    if (gig.sic_codes && gig.sic_codes.length > 0) {
      const { data: sicMatches, error: sicError } = await supabaseClient
        .from("digger_profiles")
        .select("*")
        .contains("sic_code", gig.sic_codes)
        .eq("registration_status", "complete")
        .gt("monthly_lead_count", 0);

      if (!sicError && sicMatches) {
        matchingDiggers = [...matchingDiggers, ...sicMatches];
      }
    }

    // Remove duplicates
    const uniqueDiggers = Array.from(
      new Map(matchingDiggers.map(d => [d.id, d])).values()
    );

    logStep("Found matching diggers", { count: uniqueDiggers.length });

    if (uniqueDiggers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No matching diggers found",
          matchedCount: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create exclusivity queue entries for all matching diggers
    let successfulMatches = 0;
    let failedMatches = 0;

    if (exclusivityType === 'semi-exclusive') {
      // Semi-exclusive: Create ONE queue entry, notify first 4 diggers simultaneously
      const semiExclusiveStarts = new Date();
      const semiExclusiveEnds = new Date(semiExclusiveStarts.getTime() + 24 * 60 * 60 * 1000);
      
      try {
        const { error: queueError } = await supabaseClient
          .from("lead_exclusivity_queue")
          .insert({
            gig_id: gigId,
            digger_id: uniqueDiggers[0]?.id || null, // Use first digger as placeholder
            queue_position: 1,
            base_price: pricing.semiExclusive,
            lead_source: leadSource,
            status: 'active',
            exclusivity_type: 'semi-exclusive',
            semi_exclusive_count: 0,
            semi_exclusive_max: 4,
            semi_exclusive_expires_at: semiExclusiveEnds.toISOString(),
            exclusivity_starts_at: semiExclusiveStarts.toISOString(),
            exclusivity_ends_at: semiExclusiveEnds.toISOString(),
          });

        if (queueError) {
          throw new Error(`Failed to create semi-exclusive queue: ${queueError.message}`);
        }

        // Notify up to 4 matching diggers simultaneously
        const diggersToNotify = uniqueDiggers.slice(0, 4);
        for (const digger of diggersToNotify) {
          await supabaseClient
            .from("notifications")
            .insert({
              user_id: digger.user_id,
              type: "new_lead",
              title: "⚡ Semi-Exclusive Lead Available!",
              message: `Limited to 4 diggers - 24-hour window for "${gig.title}". Act now!`,
              link: `/gig/${gigId}`,
              metadata: {
                gig_id: gigId,
                lead_price: pricing.semiExclusive,
                is_semi_exclusive: true,
                max_diggers: 4,
                expires_at: semiExclusiveEnds.toISOString(),
              },
            });
        }

        successfulMatches = diggersToNotify.length;
        logStep("Semi-exclusive lead created", { 
          notifiedDiggers: successfulMatches,
          expiresAt: semiExclusiveEnds.toISOString()
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logStep("Error creating semi-exclusive queue", { error: errorMsg });
        failedMatches = uniqueDiggers.length;
      }
    } else {
      // Exclusive: Sequential queue logic (existing behavior)
      for (let i = 0; i < uniqueDiggers.length; i++) {
        const digger = uniqueDiggers[i];
        
        try {
          // Create exclusivity queue entry
          const { error: queueError } = await supabaseClient
            .from("lead_exclusivity_queue")
            .insert({
              gig_id: gigId,
              digger_id: digger.id,
              queue_position: i + 1,
              base_price: pricing.exclusive24h,
              lead_source: leadSource,
              status: i === 0 ? 'active' : 'queued',
              exclusivity_type: 'exclusive',
            });

          if (queueError) {
            logStep("Failed to create queue entry", { 
              diggerId: digger.id, 
              error: queueError.message 
            });
            failedMatches++;
            continue;
          }

          // If this is the first digger (position 1), set exclusivity window and create notification
          if (i === 0) {
            const exclusivityStarts = new Date();
            const exclusivityEnds = new Date(exclusivityStarts.getTime() + 24 * 60 * 60 * 1000);
            
            await supabaseClient
              .from("lead_exclusivity_queue")
              .update({ 
                exclusivity_starts_at: exclusivityStarts.toISOString(),
                exclusivity_ends_at: exclusivityEnds.toISOString(),
              })
              .eq("gig_id", gigId)
              .eq("digger_id", digger.id);

            // Create notification for exclusive lead
            await supabaseClient
              .from("notifications")
              .insert({
                user_id: digger.user_id,
                type: "new_lead",
                title: "🔒 Exclusive Lead Available!",
                message: `You have 24-hour exclusive access to "${gig.title}". Act fast!`,
                link: `/gig/${gigId}`,
                metadata: {
                  gig_id: gigId,
                  lead_price: pricing.exclusive24h,
                  is_exclusive: true,
                  expires_at: exclusivityEnds.toISOString(),
                },
              });
            
            logStep("First digger activated with exclusivity", { 
              diggerId: digger.id,
              expiresAt: exclusivityEnds.toISOString()
            });
          }

          successfulMatches++;
          logStep("Digger added to queue", { diggerId: digger.id, position: i + 1 });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logStep("Error adding to queue", { 
            diggerId: digger.id, 
            error: errorMsg 
          });
          failedMatches++;
        }
      }
    }

    logStep("Lead matching completed", { 
      successfulMatches, 
      failedMatches,
      totalMatching: uniqueDiggers.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        matchedCount: successfulMatches,
        failedCount: failedMatches,
        totalMatching: uniqueDiggers.length,
        queueCreated: true,
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
