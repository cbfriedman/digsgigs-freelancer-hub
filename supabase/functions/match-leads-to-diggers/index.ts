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
const INDUSTRY_PRICING: Record<string, { nonExclusive: number; exclusive24h: number }> = {
  'low-value': { nonExclusive: 7.50, exclusive24h: 30.00 },
  'mid-value': { nonExclusive: 14.50, exclusive24h: 87.50 },
  'high-value': { nonExclusive: 24.50, exclusive24h: 187.50 },
};

// Minimum exclusive pricing by lead source
const EXCLUSIVE_MINIMUMS = {
  internet: 80,
  telemarketing: 60
};

const calculateLeadPricing = (leadSource: string = 'internet', industryCategory: string = 'mid-value') => {
  const pricing = INDUSTRY_PRICING[industryCategory] || INDUSTRY_PRICING['mid-value'];
  
  let exclusivePrice = pricing.exclusive24h;
  
  // Apply telemarketing discount (25% off = multiply by 0.75)
  if (leadSource === 'telemarketing') {
    exclusivePrice = pricing.exclusive24h * 0.75;
  }
  
  // Apply minimum pricing
  const minimum = leadSource === 'telemarketing' 
    ? EXCLUSIVE_MINIMUMS.telemarketing 
    : EXCLUSIVE_MINIMUMS.internet;
  
  exclusivePrice = Math.max(exclusivePrice, minimum);
  
  return {
    nonExclusive: pricing.nonExclusive,
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

    const { gigId } = await req.json();
    
    if (!gigId) {
      throw new Error("gigId is required");
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
    const pricing = calculateLeadPricing(leadSource, 'mid-value');
    
    logStep("Lead pricing calculated", { 
      leadSource,
      nonExclusive: pricing.nonExclusive,
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
            status: i === 0 ? 'active' : 'queued', // First digger gets active status
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
