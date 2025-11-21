import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXTEND-EXCLUSIVITY] ${step}${detailsStr}`);
};

const EXTENSION_PREMIUM = 0.33; // 33% premium
const EXTENSION_HOURS = 24;

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

    const { queueEntryId } = await req.json();
    
    if (!queueEntryId) {
      throw new Error("queueEntryId is required");
    }

    logStep("Processing exclusivity extension request", { 
      queueEntryId, 
      userId: user.id 
    });

    // Get the queue entry with digger profile
    const { data: queueEntry, error: queueError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .select("*, digger_profiles!inner(user_id)")
      .eq("id", queueEntryId)
      .eq("status", "active")
      .single();

    if (queueError || !queueEntry) {
      throw new Error("Queue entry not found or not active");
    }

    // Verify the user owns this queue entry
    if (queueEntry.digger_profiles.user_id !== user.id) {
      throw new Error("Unauthorized - not your lead");
    }

    logStep("Queue entry verified", { 
      gigId: queueEntry.gig_id,
      currentExpiry: queueEntry.exclusivity_ends_at 
    });

    // Check how many extensions already exist
    const { data: existingExtensions, error: extensionsError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .select("*")
      .eq("queue_entry_id", queueEntryId)
      .order("extension_number", { ascending: false })
      .limit(1);

    if (extensionsError) {
      throw new Error(`Failed to fetch extensions: ${extensionsError.message}`);
    }

    const nextExtensionNumber = existingExtensions && existingExtensions.length > 0
      ? existingExtensions[0].extension_number + 1
      : 1;

    // Calculate extension cost (33% premium on base price)
    const extensionCost = queueEntry.base_price * EXTENSION_PREMIUM;
    
    // Calculate new expiry (add 24 hours to current expiry)
    const currentExpiry = new Date(queueEntry.exclusivity_ends_at);
    const newExpiry = new Date(currentExpiry.getTime() + EXTENSION_HOURS * 60 * 60 * 1000);

    logStep("Extension calculated", {
      extensionNumber: nextExtensionNumber,
      extensionCost,
      currentExpiry: currentExpiry.toISOString(),
      newExpiry: newExpiry.toISOString()
    });

    // Create extension record
    const { data: extension, error: extensionError } = await supabaseClient
      .from("lead_exclusivity_extensions")
      .insert({
        queue_entry_id: queueEntryId,
        extension_number: nextExtensionNumber,
        extension_hours: EXTENSION_HOURS,
        extension_premium_percentage: EXTENSION_PREMIUM * 100,
        extension_cost: extensionCost,
        expires_at: newExpiry.toISOString(),
        payment_status: "pending",
      })
      .select()
      .single();

    if (extensionError || !extension) {
      throw new Error(`Failed to create extension: ${extensionError?.message}`);
    }

    // Update queue entry with new expiry
    const { error: updateError } = await supabaseClient
      .from("lead_exclusivity_queue")
      .update({
        exclusivity_ends_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueEntryId);

    if (updateError) {
      throw new Error(`Failed to update queue entry: ${updateError.message}`);
    }

    // Create notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "exclusivity_extended",
        title: "Exclusivity Extended!",
        message: `Your exclusive access has been extended for 24 hours until ${newExpiry.toLocaleString()}`,
        link: `/my-leads`,
        metadata: {
          queue_entry_id: queueEntryId,
          extension_number: nextExtensionNumber,
          extension_cost: extensionCost,
          new_expiry: newExpiry.toISOString(),
        },
      });

    logStep("Extension created successfully", {
      extensionId: extension.id,
      extensionNumber: nextExtensionNumber
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        extension: {
          id: extension.id,
          extension_number: nextExtensionNumber,
          extension_cost: extensionCost,
          new_expiry: newExpiry.toISOString(),
          payment_status: "pending",
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
