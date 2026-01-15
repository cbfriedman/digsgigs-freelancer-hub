import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET (query params) and POST (body) requests
    const url = new URL(req.url);
    let gigId = url.searchParams.get("gigId");
    
    // If not in query params, try to get from body
    if (!gigId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      gigId = body.gigId;
    }

    if (!gigId) {
      return new Response(
        JSON.stringify({ error: "Missing gig ID" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update gig to confirmed status
    const { data: gig, error: updateError } = await supabase
      .from("gigs")
      .update({
        confirmation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        is_confirmed_lead: true,
        status: "open",
      })
      .eq("id", gigId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Blast to diggers now that gig is confirmed
    console.log("Blasting lead to diggers for confirmed gig:", gigId);
    try {
      await supabase.functions.invoke("blast-lead-to-diggers", {
        body: { leadId: gigId }
      });
    } catch (blastError) {
      console.error("Error blasting to diggers:", blastError);
    }

    // Send management email with edit/cancel links
    console.log("Sending management email for gig:", gigId);
    try {
      const { data: mgmtData, error: mgmtError } = await supabase.functions.invoke("send-gig-management-email", {
        body: { gigId }
      });
      
      if (mgmtError) {
        console.error("Error sending management email:", mgmtError);
        // Log the error but don't fail the confirmation
      } else {
        console.log("Management email sent successfully:", mgmtData);
      }
    } catch (mgmtError) {
      console.error("Exception sending management email:", mgmtError);
      // Log the error but don't fail the confirmation
    }

    // Return success response (frontend will handle redirect)
    // If called via GET (email link), redirect. If POST (button click), return JSON
    const isGetRequest = req.method === "GET";
    
    if (isGetRequest) {
      // Redirect for email link clicks
      const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";
      const redirectUrl = `${siteUrl}/gig-confirmed?gigId=${gigId}`;
      
      console.log("Redirecting to:", redirectUrl);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": redirectUrl,
          ...corsHeaders,
        },
      });
    } else {
      // Return JSON for API calls
      return new Response(
        JSON.stringify({ success: true, gigId }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error confirming gig:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
