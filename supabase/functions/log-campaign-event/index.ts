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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
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

    // Insert campaign conversion record
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
      console.error("Error inserting campaign conversion:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log campaign event", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Campaign event logged successfully:", data.id);
    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in log-campaign-event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // Always return CORS headers even on error
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
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
