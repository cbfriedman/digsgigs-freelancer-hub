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

    // Redirect to success page
    const redirectUrl = `${supabaseUrl.replace('/functions/v1', '')}/gig-confirmed?gigId=${gigId}`;
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gig Confirmed - Digs and Gigs</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #667eea;
              margin: 0 0 16px 0;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin: 0 0 24px 0;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin-top: 8px;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success-icon">✓</div>
            <h1>Gig Confirmed!</h1>
            <p>Your gig has been successfully confirmed and is now live. Qualified professionals in your area will be notified and can start sending you proposals.</p>
            <p>You will receive notifications when professionals purchase your lead and reach out to you.</p>
            <a href="/" class="button">Return to Dashboard</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
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
