import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TRIGGER-DAILY-BLOG] Starting daily blog generation trigger");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    // Call the generate-blog-post function
    const generateUrl = `${SUPABASE_URL}/functions/v1/generate-blog-post`;
    
    console.log("[TRIGGER-DAILY-BLOG] Calling generate-blog-post function");

    const response = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[TRIGGER-DAILY-BLOG] Error generating post:", data);
      throw new Error(data.error || "Failed to generate blog post");
    }

    console.log("[TRIGGER-DAILY-BLOG] Blog post generated successfully:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily blog post generated successfully",
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TRIGGER-DAILY-BLOG] ERROR:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
