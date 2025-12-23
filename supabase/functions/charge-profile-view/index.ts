import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-PROFILE-VIEW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Service role client for admin operations (click tracking)
  const supabaseServiceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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

    const { diggerId } = await req.json();
    
    if (!diggerId) {
      throw new Error("Missing required field: diggerId");
    }

    logStep("Request data", { diggerId });

    // Get digger profile to check subscription status FIRST
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from('digger_profiles')
      .select('subscription_status, subscription_tier, business_name, user_id, id')
      .eq('id', diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    logStep("Digger profile found", { 
      subscription_status: diggerProfile.subscription_status,
      tier: diggerProfile.subscription_tier 
    });

    // CRITICAL: Check if digger has active subscription
    // If not subscribed, digger must subscribe before consumers can view contact info
    if (diggerProfile.subscription_status !== 'active') {
      logStep("Digger not subscribed - subscription required", { 
        diggerId,
        subscription_status: diggerProfile.subscription_status 
      });
      
      return new Response(JSON.stringify({ 
        requiresSubscription: true,
        diggerId: diggerProfile.id,
        message: "This digger needs to activate their subscription before consumers can view contact information."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402, // Payment Required
      });
    }

    // Record click for subscribed digger (for price lock tracking)
    try {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if record exists for this month
      const { data: existingClick } = await supabaseServiceClient
        .from('digger_monthly_clicks')
        .select('id, click_count')
        .eq('digger_id', diggerId)
        .eq('month_year', monthYear)
        .single();

      if (existingClick) {
        // Update existing record
        await supabaseServiceClient
          .from('digger_monthly_clicks')
          .update({ 
            click_count: existingClick.click_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingClick.id);
      } else {
        // Create new record
        await supabaseServiceClient
          .from('digger_monthly_clicks')
          .insert({
            digger_id: diggerId,
            month_year: monthYear,
            click_count: 1,
          });
      }
      logStep("Click recorded for subscribed digger", { diggerId, monthYear });
    } catch (clickError) {
      // Don't fail the request if click recording fails, just log it
      logStep("Warning: Failed to record click", { error: clickError });
    }

    // Check if user has already viewed this profile
    const { data: existingView } = await supabaseClient
      .from('profile_views')
      .select('*')
      .eq('consumer_id', user.id)
      .eq('digger_id', diggerId)
      .single();

    if (existingView) {
      logStep("Profile already viewed, no charge");
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyPaid: true,
        message: "Contact info already unlocked"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For subscribed diggers, consumers can view contact info for free
    // (Digger already paid subscription, so no additional charge to consumer)
    logStep("Digger is subscribed - unlocking contact info for free", { diggerId });

    // Record the profile view
    const { error: viewError } = await supabaseClient
      .from('profile_views')
      .insert({
        consumer_id: user.id,
        digger_id: diggerId,
        amount_charged: 0, // Free for subscribed diggers
      });

    if (viewError) {
      throw new Error(`Failed to record profile view: ${viewError.message}`);
    }

    logStep("Profile view recorded", { consumerId: user.id, diggerId });

    return new Response(JSON.stringify({ 
      success: true,
      charged: false,
      alreadyPaid: true,
      message: "Contact info unlocked (digger has active subscription)"
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