import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-PROFILE-CLICK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { digger_profile_id } = await req.json();

    if (!digger_profile_id) {
      throw new Error("Missing required parameter: digger_profile_id");
    }

    logStep("Recording click for digger", { digger_profile_id });

    // Get current month-year
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if the digger has an active subscription
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('id, subscription_status, subscription_tier')
      .eq('id', digger_profile_id)
      .single();

    if (profileError) {
      logStep("Error fetching digger profile", { error: profileError });
      throw new Error("Digger profile not found");
    }

    // Only record clicks for active subscriptions
    if (diggerProfile.subscription_status !== 'active') {
      logStep("Digger does not have active subscription, skipping click recording");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No active subscription, click not recorded for pricing purposes" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Upsert click count for this month
    const { data: existingRecord, error: fetchError } = await supabaseClient
      .from('digger_monthly_clicks')
      .select('id, click_count')
      .eq('digger_id', digger_profile_id)
      .eq('month_year', monthYear)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      logStep("Error fetching existing click record", { error: fetchError });
    }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('digger_monthly_clicks')
        .update({ 
          click_count: existingRecord.click_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        logStep("Error updating click count", { error: updateError });
        throw new Error("Failed to update click count");
      }

      logStep("Click count updated", { 
        digger_profile_id, 
        monthYear, 
        newCount: existingRecord.click_count + 1 
      });
    } else {
      // Create new record
      const { error: insertError } = await supabaseClient
        .from('digger_monthly_clicks')
        .insert({
          digger_id: digger_profile_id,
          month_year: monthYear,
          click_count: 1,
        });

      if (insertError) {
        logStep("Error inserting click record", { error: insertError });
        throw new Error("Failed to record click");
      }

      logStep("New click record created", { digger_profile_id, monthYear });
    }

    return new Response(JSON.stringify({ 
      success: true,
      month_year: monthYear,
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
