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

    logStep("Gig details retrieved", { title: gig.title });

    // Calculate lead price
    const { data: priceData, error: priceError } = await supabaseClient
      .rpc("calculate_lead_price", {
        gig_budget_min: gig.budget_min || 0,
        gig_budget_max: gig.budget_max || 0,
      });

    if (priceError) {
      throw new Error(`Price calculation failed: ${priceError.message}`);
    }

    const leadPrice = priceData || 50;
    logStep("Lead price calculated", { leadPrice });

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

    // Select best 4 diggers based on rating, response time, and completion rate
    const selectedDiggers = uniqueDiggers
      .sort((a, b) => {
        // Sort by average rating (desc), then response time (asc), then completion rate (desc)
        if ((b.average_rating || 0) !== (a.average_rating || 0)) {
          return (b.average_rating || 0) - (a.average_rating || 0);
        }
        if ((a.response_time_hours || 999) !== (b.response_time_hours || 999)) {
          return (a.response_time_hours || 999) - (b.response_time_hours || 999);
        }
        return (b.completion_rate || 0) - (a.completion_rate || 0);
      })
      .slice(0, 4); // Limit to top 4 diggers

    logStep("Selected top diggers for lead", { 
      totalMatches: uniqueDiggers.length,
      selectedCount: selectedDiggers.length 
    });

    // Create lead purchases for selected diggers only
    let successfulMatches = 0;
    let failedMatches = 0;

    for (const digger of selectedDiggers) {
      try {
        // Create lead purchase record
        const { error: purchaseError } = await supabaseClient
          .from("lead_purchases")
          .insert({
            gig_id: gigId,
            digger_id: digger.id,
            consumer_id: gig.consumer_id,
            purchase_price: leadPrice,
            amount_paid: leadPrice,
            status: "active",
          });

        if (purchaseError) {
          logStep("Failed to create lead purchase", { 
            diggerId: digger.id, 
            error: purchaseError.message 
          });
          failedMatches++;
          continue;
        }

        // Decrement monthly lead count
        const { error: updateError } = await supabaseClient
          .from("digger_profiles")
          .update({ 
            monthly_lead_count: digger.monthly_lead_count - 1 
          })
          .eq("id", digger.id);

        if (updateError) {
          logStep("Failed to update lead count", { 
            diggerId: digger.id, 
            error: updateError.message 
          });
        }

        // Create notification
        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: digger.user_id,
            type: "new_lead",
            title: "New Lead Available!",
            message: `A new gig "${gig.title}" matches your profile. View it now!`,
            link: `/gig/${gigId}`,
            metadata: {
              gig_id: gigId,
              lead_price: leadPrice,
            },
          });

        if (notifError) {
          logStep("Failed to create notification", { 
            diggerId: digger.id, 
            error: notifError.message 
          });
        }

        successfulMatches++;
        logStep("Lead matched successfully", { diggerId: digger.id });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logStep("Error matching lead", { 
          diggerId: digger.id, 
          error: errorMsg 
        });
        failedMatches++;
      }
    }

    // Update gig purchase count
    await supabaseClient
      .from("gigs")
      .update({ 
        purchase_count: (gig.purchase_count || 0) + successfulMatches 
      })
      .eq("id", gigId);

    logStep("Lead matching completed", { 
      successfulMatches, 
      failedMatches,
      totalMatching: uniqueDiggers.length,
      selected: selectedDiggers.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        matchedCount: successfulMatches,
        failedCount: failedMatches,
        totalMatching: uniqueDiggers.length,
        selectedDiggers: selectedDiggers.length,
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
