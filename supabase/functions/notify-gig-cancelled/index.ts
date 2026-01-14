import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelNotificationRequest {
  gigId: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gigId, reason }: CancelNotificationRequest = await req.json();

    if (!gigId) {
      throw new Error("Missing gigId");
    }

    console.log("[notify-gig-cancelled] Processing gig:", gigId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch gig details
    const { data: gig, error: gigError } = await supabase
      .from("gigs")
      .select("*")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Could not find gig: ${gigError?.message || "Not found"}`);
    }

    // Fetch all diggers who unlocked this lead
    const { data: unlocks, error: unlocksError } = await supabase
      .from("lead_unlocks")
      .select(`
        digger_id,
        digger_profiles!inner(
          user_id,
          business_name
        )
      `)
      .eq("gig_id", gigId);

    if (unlocksError) {
      console.error("[notify-gig-cancelled] Error fetching unlocks:", unlocksError);
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!unlocks || unlocks.length === 0) {
      console.log("[notify-gig-cancelled] No unlocks found for this gig");
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get email addresses for all diggers
    const userIds = unlocks.map((u: any) => u.digger_profiles.user_id);
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (profilesError || !profiles) {
      console.error("[notify-gig-cancelled] Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch digger profiles");
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";

    let notifiedCount = 0;

    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [profile.email],
          subject: `Project Update: "${gig.title}" has been cancelled`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                  }
                  .container {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                  }
                  .header {
                    background: #fef2f2;
                    padding: 25px;
                    text-align: center;
                    border-bottom: 1px solid #fecaca;
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #dc2626;
                  }
                  .content {
                    padding: 25px;
                  }
                  .project-info {
                    background: #f9fafb;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                  }
                  .refund-box {
                    background: #ecfdf5;
                    border-left: 4px solid #10b981;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                  }
                  .action-button {
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                  }
                  .footer {
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                    padding: 20px;
                    border-top: 1px solid #e5e7eb;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Project Cancelled</h1>
                  </div>
                  
                  <div class="content">
                    <p>We wanted to let you know that a project you unlocked has been cancelled by the client.</p>
                    
                    <div class="project-info">
                      <strong>Project:</strong> ${gig.title || "Untitled Project"}
                      ${reason ? `<br><strong>Reason:</strong> ${reason}` : ""}
                    </div>
                    
                    <div class="refund-box">
                      <strong>💰 Refund Eligibility</strong>
                      <p style="margin: 10px 0 0 0;">
                        Since this project was cancelled, you may be eligible for a lead credit refund. 
                        Please contact our support team within 7 days if you haven't been able to reach the client.
                      </p>
                    </div>
                    
                    <p>Don't worry — there are plenty more opportunities available!</p>
                    
                    <p style="text-align: center; margin-top: 25px;">
                      <a href="${siteUrl}/role-dashboard" class="action-button">
                        Browse More Leads
                      </a>
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p>Questions? Reply to this email or visit our <a href="${siteUrl}/faq" style="color: #667eea;">FAQ</a>.</p>
                    <p>© 2025 Digs and Gigs. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        notifiedCount++;
        console.log(`[notify-gig-cancelled] Notified: ${profile.email}`);
      } catch (emailErr) {
        console.error(`[notify-gig-cancelled] Failed to notify ${profile.email}:`, emailErr);
      }
    }

    console.log(`[notify-gig-cancelled] Total notified: ${notifiedCount}`);

    return new Response(JSON.stringify({ success: true, notified: notifiedCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[notify-gig-cancelled] Error:", error);
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
