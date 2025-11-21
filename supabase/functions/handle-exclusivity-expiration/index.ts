import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXCLUSIVITY-EXPIRATION] ${step}${detailsStr}`);
};

// Industry pricing mapping
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

    logStep("Checking for expired exclusivity periods");

    // Find all expired exclusive queue entries that haven't been awarded or converted
    const { data: expiredEntries, error: fetchError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .select("*, gigs!inner(*)")
      .eq("status", "active")
      .lt("exclusivity_ends_at", new Date().toISOString())
      .is("awarded_at", null)
      .is("converted_to_nonexclusive_at", null);

    if (fetchError) {
      throw new Error(`Failed to fetch expired entries: ${fetchError.message}`);
    }

    if (!expiredEntries || expiredEntries.length === 0) {
      logStep("No expired exclusivity periods found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found expired entries", { count: expiredEntries.length });

    let processed = 0;
    let errors = 0;

    for (const entry of expiredEntries) {
      try {
        const gigId = entry.gig_id;
        const currentDiggerId = entry.digger_id;

        logStep("Processing expired entry", { 
          gigId, 
          currentDiggerId,
          queuePosition: entry.queue_position 
        });

        // Check if there's a next digger in queue
        const { data: nextInQueue, error: nextError } = await supabaseClient
          .from("lead_exclusivity_queue")
          .select("*")
          .eq("gig_id", gigId)
          .eq("status", "queued")
          .order("queue_position", { ascending: true })
          .limit(1)
          .single();

        if (!nextError && nextInQueue) {
          // Move to next digger in queue
          logStep("Moving to next digger in queue", { 
            nextDiggerId: nextInQueue.digger_id,
            nextPosition: nextInQueue.queue_position 
          });

          // Mark current entry as expired
          await supabaseClient
            .from("lead_exclusivity_queue")
            .update({ status: "expired" })
            .eq("id", entry.id);

          // Activate next digger with new 24-hour window
          const exclusivityStarts = new Date();
          const exclusivityEnds = new Date(exclusivityStarts.getTime() + 24 * 60 * 60 * 1000);

          await supabaseClient
            .from("lead_exclusivity_queue")
            .update({ 
              status: "active",
              exclusivity_starts_at: exclusivityStarts.toISOString(),
              exclusivity_ends_at: exclusivityEnds.toISOString(),
            })
            .eq("id", nextInQueue.id);

          // Get digger profile for notification
          const { data: diggerProfile } = await supabaseClient
            .from("digger_profiles")
            .select("user_id")
            .eq("id", nextInQueue.digger_id)
            .single();

          if (diggerProfile) {
            // Notify next digger
            await supabaseClient
              .from("notifications")
              .insert({
                user_id: diggerProfile.user_id,
                type: "new_lead",
                title: "🔒 Your Exclusive Lead is Now Active!",
                message: `You now have 24-hour exclusive access to "${entry.gigs.title}". Act fast!`,
                link: `/gig/${gigId}`,
                metadata: {
                  gig_id: gigId,
                  lead_price: entry.base_price,
                  is_exclusive: true,
                  expires_at: exclusivityEnds.toISOString(),
                  queue_position: nextInQueue.queue_position,
                },
              });
          }

          logStep("Successfully moved to next digger", { 
            nextDiggerId: nextInQueue.digger_id 
          });
        } else {
          // No more diggers in queue - convert to non-exclusive
          logStep("No more diggers in queue, converting to non-exclusive", { gigId });

          // Mark queue as exhausted
          await supabaseClient
            .from("lead_exclusivity_queue")
            .update({ 
              status: "converted_to_nonexclusive",
              converted_to_nonexclusive_at: new Date().toISOString(),
            })
            .eq("gig_id", gigId);

          // Find all matching diggers (excluding those who already had exclusive access)
          const { data: allMatchingDiggers, error: matchError } = await supabaseClient
            .from("digger_profiles")
            .select("*")
            .or(`naics_code.cs.{${entry.gigs.naics_codes?.join(',') || ''}},sic_code.cs.{${entry.gigs.sic_codes?.join(',') || ''}}`)
            .eq("registration_status", "complete")
            .gt("monthly_lead_count", 0)
            .not("id", "in", `(${await getExclusiveDiggerIds(supabaseClient, gigId)})`);

          if (matchError) {
            logStep("Error finding matching diggers", { error: matchError.message });
          } else if (allMatchingDiggers && allMatchingDiggers.length > 0) {
            // Calculate non-exclusive price (use mid-value as default)
            const nonExclusivePrice = INDUSTRY_PRICING['mid-value'].nonExclusive;

            // Create non-exclusive lead purchases for all matching diggers
            for (const digger of allMatchingDiggers) {
              await supabaseClient
                .from("lead_purchases")
                .insert({
                  gig_id: gigId,
                  digger_id: digger.id,
                  consumer_id: entry.gigs.consumer_id,
                  purchase_price: nonExclusivePrice,
                  amount_paid: nonExclusivePrice,
                  base_price: nonExclusivePrice,
                  is_exclusive: false,
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
                  message: `A new non-exclusive lead "${entry.gigs.title}" is now available.`,
                  link: `/gig/${gigId}`,
                  metadata: {
                    gig_id: gigId,
                    lead_price: nonExclusivePrice,
                    is_exclusive: false,
                  },
                });
            }

            logStep("Created non-exclusive purchases", { 
              count: allMatchingDiggers.length 
            });
          }
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

    logStep("Expiration handling completed", { processed, errors });

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

// Helper function to get all digger IDs who had exclusive access
async function getExclusiveDiggerIds(supabaseClient: any, gigId: string): Promise<string> {
  const { data } = await supabaseClient
    .from("lead_exclusivity_queue")
    .select("digger_id")
    .eq("gig_id", gigId);
  
  return data?.map((d: any) => d.digger_id).join(',') || '';
}
