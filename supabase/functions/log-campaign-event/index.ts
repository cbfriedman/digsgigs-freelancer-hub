import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration - allow all origins for this function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // 24 hours
};

serve(async (req) => {
  // Handle CORS preflight - MUST return 200 OK
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Logging campaign event:", JSON.stringify(body));

    const {
      conversion_type,
      email,
      user_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landing_page,
      referrer,
      device_type,
      browser,
    } = body;

    // Validate required fields
    if (!conversion_type) {
      console.error("Missing conversion_type");
      return new Response(
        JSON.stringify({ error: "conversion_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP address from request headers
    const ip_address = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       req.headers.get("x-real-ip") || 
                       "unknown";

    // Insert campaign conversion record using service role (bypasses RLS)
    const { data, error } = await supabase
      .from("campaign_conversions")
      .insert({
        conversion_type,
        email: email || null,
        user_id: user_id || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        landing_page: landing_page || null,
        referrer: referrer || null,
        device_type: device_type || null,
        browser: browser || null,
        ip_address,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting campaign conversion:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Return error with more details for debugging
      return new Response(
        JSON.stringify({ 
          error: "Failed to log campaign event", 
          details: error.message,
          code: error.code,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Campaign event logged successfully:", data?.id);
    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in log-campaign-event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    // Always return CORS headers even on error
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
