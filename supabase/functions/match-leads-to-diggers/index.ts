import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MATCH-LEADS] ${step}${detailsStr}`);
};

// Industry pricing mapping
const INDUSTRY_PRICING: Record<string, { nonExclusive: number; semiExclusive: number; exclusive24h: number }> = {
  'low-value': { nonExclusive: 7.50, semiExclusive: 30.00, exclusive24h: 60.00 },
  'mid-value': { nonExclusive: 14.50, semiExclusive: 58.00, exclusive24h: 125.00 },
  'high-value': { nonExclusive: 24.50, semiExclusive: 99.00, exclusive24h: 275.00 },
};

// Minimum exclusive pricing by lead source
const EXCLUSIVE_MINIMUMS = {
  internet: 80,
  telemarketing: 60
};

const calculateLeadPricing = (
  leadSource: string = 'internet', 
  industryCategory: string = 'mid-value',
  exclusivityType: 'exclusive' | 'semi-exclusive' = 'exclusive'
) => {
  const pricing = INDUSTRY_PRICING[industryCategory] || INDUSTRY_PRICING['mid-value'];
  
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
    semiExclusive: semiExclusivePrice,
    exclusive24h: exclusivePrice
  };
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

    const { gigId, exclusivityType = 'exclusive' } = await req.json();
    
    if (!gigId) {
      throw new Error("gigId is required");
    }
    
    if (exclusivityType !== 'exclusive' && exclusivityType !== 'semi-exclusive') {
      throw new Error("exclusivityType must be 'exclusive' or 'semi-exclusive'");
    }

    logStep("Starting lead matching", { gigId });

    // Get the gig details
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("*, profiles!gigs_consumer_id_fkey(id, email, full_name)")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Gig not found: ${gigError?.message}`);
    }

    logStep("Gig details retrieved", { title: gig.title, leadSource: gig.lead_source });

    // Determine lead source (default to internet if not specified)
    const leadSource = gig.lead_source || 'internet';
    
    // Calculate pricing (use mid-value as default if category not determined)
    const pricing = calculateLeadPricing(leadSource, 'mid-value', exclusivityType);
    
    logStep("Lead pricing calculated", { 
      leadSource,
      exclusivityType,
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
