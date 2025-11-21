import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AWARD-LEAD] ${step}${detailsStr}`);
};

const POST_AWARD_WINDOW_HOURS = 48;

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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { gigId, diggerId, awardMethod, bidId } = await req.json();
    
    if (!gigId || !diggerId || !awardMethod) {
      throw new Error("gigId, diggerId, and awardMethod are required");
    }

    // Validate award method
    const validMethods = ['consumer_hire', 'bid_acceptance', 'escrow_payment'];
    if (!validMethods.includes(awardMethod)) {
      throw new Error(`Invalid award method. Must be one of: ${validMethods.join(', ')}`);
    }

    logStep("Processing lead award", { 
      gigId, 
      diggerId, 
      awardMethod,
      bidId,
      userId: user.id 
    });

    // Get the gig and verify the user is the consumer
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("*")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Gig not found: ${gigError?.message}`);
    }

    if (gig.consumer_id !== user.id) {
      throw new Error("Unauthorized - not your gig");
    }

    // Check if already awarded
    if (gig.awarded_at) {
      logStep("Gig already awarded", { 
        awardedAt: gig.awarded_at,
        awardedDiggerId: gig.awarded_digger_id 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Lead already awarded",
          awardedAt: gig.awarded_at,
          awardedDiggerId: gig.awarded_digger_id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const awardedAt = new Date().toISOString();
    const postAwardExpiry = new Date(Date.now() + POST_AWARD_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    logStep("Award timestamps calculated", { 
      awardedAt,
      postAwardExpiry 
    });

    // Update bid if this is a bid-based award
    if (bidId) {
      const { error: bidError } = await supabaseClient
        .from("bids")
        .update({
          awarded: true,
          awarded_at: awardedAt,
          awarded_by: user.id,
          award_method: awardMethod,
        })
        .eq("id", bidId);

      if (bidError) {
        throw new Error(`Failed to update bid: ${bidError.message}`);
      }

      logStep("Bid updated", { bidId });
    }

    // Update gig with award information
    const { error: gigUpdateError } = await supabaseClient
      .from("gigs")
      .update({
        awarded_at: awardedAt,
        awarded_digger_id: diggerId,
        awarded_bid_id: bidId || null,
        status: "awarded",
      })
      .eq("id", gigId);

    if (gigUpdateError) {
      throw new Error(`Failed to update gig: ${gigUpdateError.message}`);
    }

    logStep("Gig updated with award", { gigId });

    // Find and update the lead purchase record
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from("lead_purchases")
      .select("*")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .single();

    if (purchaseError || !leadPurchase) {
      logStep("Warning: Lead purchase not found", { 
        gigId, 
        diggerId,
        error: purchaseError?.message 
      });
    } else {
      const { error: purchaseUpdateError } = await supabaseClient
        .from("lead_purchases")
        .update({
          awarded_at: awardedAt,
          award_expires_at: postAwardExpiry,
          status: "awarded",
        })
        .eq("id", leadPurchase.id);

      if (purchaseUpdateError) {
        logStep("Warning: Failed to update lead purchase", { 
          error: purchaseUpdateError.message 
        });
      } else {
        logStep("Lead purchase updated", { leadPurchaseId: leadPurchase.id });
      }
    }

    // Update exclusivity queue entry if exists
    const { data: queueEntry, error: queueError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .select("*")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .single();

    if (!queueError && queueEntry) {
      const { error: queueUpdateError } = await supabaseClient
        .from("lead_exclusivity_queue")
        .update({
          status: "awarded",
          awarded_at: awardedAt,
        })
        .eq("id", queueEntry.id);

      if (queueUpdateError) {
        logStep("Warning: Failed to update queue entry", { 
          error: queueUpdateError.message 
        });
      } else {
        logStep("Queue entry updated", { queueEntryId: queueEntry.id });
      }
    }

    // Trigger telemarketer commission calculation if applicable
    if (gig.lead_source === 'telemarketing' && gig.telemarketer_id && leadPurchase) {
      logStep("Triggering telemarketer commission calculation", {
        telemarketer_id: gig.telemarketer_id,
        leadPurchaseId: leadPurchase.id
      });

      try {
        const { error: commissionError } = await supabaseClient.functions.invoke(
          'calculate-telemarketer-commission',
          {
            body: {
              leadPurchaseId: leadPurchase.id,
              gigId: gigId,
              awardedAt: awardedAt,
            }
          }
        );

        if (commissionError) {
          logStep("Warning: Commission calculation failed", { 
            error: commissionError.message 
          });
        } else {
          logStep("Commission calculation triggered successfully");
        }
      } catch (error) {
        logStep("Warning: Failed to invoke commission function", { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // Get digger profile for notification
    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("user_id, business_name")
      .eq("id", diggerId)
      .single();

    if (diggerProfile) {
      // Notify the awarded digger
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: diggerProfile.user_id,
          type: "lead_awarded",
          title: "🎉 Lead Awarded!",
          message: `Congratulations! You've been awarded the lead for "${gig.title}". You have 48 hours of exclusive access.`,
          link: `/gig/${gigId}`,
          metadata: {
            gig_id: gigId,
            award_method: awardMethod,
            awarded_at: awardedAt,
            expires_at: postAwardExpiry,
            bid_id: bidId,
          },
        });

      logStep("Notification sent to digger", { 
        userId: diggerProfile.user_id 
      });
    }

    // Mark other queue entries as expired (they no longer have access)
    await supabaseClient
      .from("lead_exclusivity_queue")
      .update({ status: "expired" })
      .eq("gig_id", gigId)
      .neq("digger_id", diggerId)
      .in("status", ["queued", "active"]);

    logStep("Other queue entries marked as expired");

    logStep("Lead award completed successfully", {
      gigId,
      diggerId,
      awardMethod,
      awardedAt,
      postAwardExpiry
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        award: {
          gig_id: gigId,
          digger_id: diggerId,
          awarded_at: awardedAt,
          award_method: awardMethod,
          post_award_expiry: postAwardExpiry,
          bid_id: bidId,
        }
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
