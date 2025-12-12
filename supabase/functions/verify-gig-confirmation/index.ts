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
    const url = new URL(req.url);
    const gigId = url.searchParams.get("gigId");

    if (!gigId) {
      return new Response("Missing gig ID", { status: 400 });
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

    // Trigger digger matching now that gig is confirmed
    console.log("Matching diggers for confirmed gig:", gigId);
    try {
      const { data: matchData } = await supabase.functions.invoke("match-diggers-semantic", {
        body: {
          gig_title: gig.title,
          gig_description: gig.description,
          gig_category: gig.category_id,
        },
      });

      if (matchData?.matches && matchData.matches.length > 0) {
        for (const match of matchData.matches) {
          await supabase.rpc('create_notification', {
            p_user_id: match.user_id,
            p_title: 'New Confirmed Gig Match',
            p_message: `${match.business_name}, we found a confirmed gig that matches your expertise! "${gig.title}"`,
            p_type: 'new_gig',
            p_link: `/gig/${gigId}`,
            p_metadata: {
              gig_id: gigId,
              confidence: match.confidence,
              is_confirmed: true,
            }
          });
        }
      }
    } catch (matchError) {
      console.error("Error matching diggers:", matchError);
    }

    // Redirect to frontend success page
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";
    const redirectUrl = `${siteUrl}/gig-confirmed?gigId=${gigId}`;
    
    console.log("Redirecting to:", redirectUrl);

    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl,
      },
    });
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
