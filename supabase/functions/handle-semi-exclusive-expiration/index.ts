import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEMI-EXCLUSIVE-EXPIRATION] ${step}${detailsStr}`);
};

// Industry pricing mapping for non-exclusive conversion
const INDUSTRY_PRICING: Record<string, { nonExclusive: number }> = {
  'low-value': { nonExclusive: 7.50 },
  'mid-value': { nonExclusive: 14.50 },
  'high-value': { nonExclusive: 24.50 },
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

    logStep("Checking for expired semi-exclusive leads");

    // Find semi-exclusive leads that have expired (24hr window OR 4 purchases reached)
    const { data: expiredEntries, error: fetchError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .select("*, gigs!inner(*)")
      .eq("exclusivity_type", "semi-exclusive")
      .eq("status", "active")
      .or(`semi_exclusive_expires_at.lt.${new Date().toISOString()},semi_exclusive_count.gte.4`)
      .is("converted_to_nonexclusive_at", null);

    if (fetchError) {
      throw new Error(`Failed to fetch expired entries: ${fetchError.message}`);
    }

    if (!expiredEntries || expiredEntries.length === 0) {
      logStep("No expired semi-exclusive leads found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found expired semi-exclusive leads", { count: expiredEntries.length });

    let processed = 0;
    let errors = 0;

    for (const entry of expiredEntries) {
      try {
        const gigId = entry.gig_id;
        const expirationReason = entry.semi_exclusive_count >= 4 
          ? "max_purchases_reached" 
          : "time_expired";

        logStep("Processing expired semi-exclusive lead", { 
          gigId, 
          reason: expirationReason,
          purchaseCount: entry.semi_exclusive_count
        });

        // Mark queue entry as converted to non-exclusive
        await supabaseClient
          .from("lead_exclusivity_queue")
          .update({ 
            status: "converted_to_nonexclusive",
            converted_to_nonexclusive_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        // Get all diggers who already purchased this semi-exclusive lead
        const { data: existingPurchases } = await supabaseClient
          .from("lead_purchases")
          .select("digger_id")
          .eq("gig_id", gigId)
          .eq("exclusivity_type", "semi-exclusive");

        const existingDiggerIds = existingPurchases?.map(p => p.digger_id) || [];

        // Find all matching diggers (excluding those who already purchased)
        let matchQuery = supabaseClient
          .from("digger_profiles")
          .select("*")
          .eq("registration_status", "complete")
          .gt("monthly_lead_count", 0);

        if (existingDiggerIds.length > 0) {
          matchQuery = matchQuery.not("id", "in", `(${existingDiggerIds.join(',')})`);
        }

        // Match by NAICS or SIC codes
        const naicsCodes = entry.gigs.naics_codes || [];
        const sicCodes = entry.gigs.sic_codes || [];
        
        if (naicsCodes.length > 0 || sicCodes.length > 0) {
          const orConditions: string[] = [];
          if (naicsCodes.length > 0) orConditions.push(`naics_code.cs.{${naicsCodes.join(',')}}`);
          if (sicCodes.length > 0) orConditions.push(`sic_code.cs.{${sicCodes.join(',')}}`);
          matchQuery = matchQuery.or(orConditions.join(','));
        }

        const { data: remainingDiggers, error: matchError } = await matchQuery;

        if (matchError) {
          logStep("Error finding remaining diggers", { error: matchError.message });
        } else if (remainingDiggers && remainingDiggers.length > 0) {
          // Calculate non-exclusive price
          const nonExclusivePrice = INDUSTRY_PRICING['mid-value'].nonExclusive;

          logStep("Converting to non-exclusive for remaining diggers", { 
            count: remainingDiggers.length 
          });

          // Create non-exclusive lead purchases and notifications
          for (const digger of remainingDiggers) {
            await supabaseClient
              .from("lead_purchases")
              .insert({
                gig_id: gigId,
                digger_id: digger.id,
                consumer_id: entry.gigs.consumer_id,
                purchase_price: nonExclusivePrice,
                amount_paid: nonExclusivePrice,
                base_price: nonExclusivePrice,
                exclusivity_type: "non-exclusive",
                lead_source: entry.lead_source,
                converted_from_exclusive: true,
                status: "active",
              });

            // Create notification
            await supabaseClient
              .from("notifications")
              .insert({
                user_id: digger.user_id,
                type: "new_lead",
                title: "New Lead Available!",
                message: `"${entry.gigs.title}" is now available as a non-exclusive lead.`,
                link: `/gig/${gigId}`,
                metadata: {
                  gig_id: gigId,
                  lead_price: nonExclusivePrice,
                  is_exclusive: false,
                },
              });
          }

          logStep("Successfully converted to non-exclusive", { 
            gigId,
            notifiedDiggers: remainingDiggers.length 
          });
        } else {
          logStep("No additional diggers to notify", { gigId });
        }

        processed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logStep("Error processing entry", { 
          entryId: entry.id, 
          error: errorMsg 
        });
        errors++;
      }
    }

    logStep("Semi-exclusive expiration handling completed", { processed, errors });

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        errors,
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
        status: 500,
      }
    );
  }
});
