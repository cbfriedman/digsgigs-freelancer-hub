import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManagementEmailRequest {
  gigId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gigId }: ManagementEmailRequest = await req.json();

    if (!gigId) {
      throw new Error("Missing gigId");
    }

    console.log("[send-gig-management-email] Processing gig:", gigId);

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
      console.error("[send-gig-management-email] Gig fetch error:", gigError);
      throw new Error(`Could not find gig: ${gigError?.message || "Not found"}`);
    }

    console.log("[send-gig-management-email] Gig found:", {
      id: gig.id,
      title: gig.title,
      consumer_email: gig.consumer_email,
      confirmation_status: gig.confirmation_status,
      status: gig.status
    });

    if (!gig.consumer_email) {
      console.error("[send-gig-management-email] No consumer_email in gig:", gig);
      throw new Error("No email address found for this gig");
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";
    const currentYear = new Date().getFullYear();
    const escapeHtml = (s: string) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Format budget
    const budgetText = gig.budget_min && gig.budget_max
      ? `$${gig.budget_min.toLocaleString()} - $${gig.budget_max.toLocaleString()}`
      : gig.budget_min
      ? `$${gig.budget_min.toLocaleString()}+`
      : "Budget not specified";

    // Generate URLs for management actions
    const viewUrl = `${siteUrl}/gig/${gigId}`;
    const editUrl = `${siteUrl}/gig/${gigId}/edit`;
    const cancelUrl = `${siteUrl}/gig/${gigId}/cancel`;
    const myGigsUrl = `${siteUrl}/my-gigs`;

    console.log("[send-gig-management-email] Sending email to:", gig.consumer_email);

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <noreply@digsandgigs.net>",
      to: [gig.consumer_email],
      subject: "🎉 Your project is live! Here's how to manage it",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Your project is live</title>
            <style>
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
              .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
              .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
              .header p { margin: 8px 0 0 0; font-size: 15px; opacity: 0.95; }
              .content { padding: 28px 24px; }
              .content p { margin: 0 0 16px 0; font-size: 15px; color: #374151; }
              .content p:last-of-type { margin-bottom: 0; }
              .actions { margin: 24px 0; }
              .action-row { margin-bottom: 10px; }
              .btn { display: inline-block; padding: 12px 20px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; text-align: center; }
              .btn-primary { background: #7c3aed; color: #ffffff !important; }
              .btn-secondary { background: #f3f4f6; color: #374151 !important; border: 1px solid #e5e7eb; }
              .btn-danger { background: #fef2f2; color: #b91c1c !important; border: 1px solid #fecaca; }
              .project-card { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
              .project-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px; }
              .detail-row { margin: 6px 0; font-size: 14px; }
              .detail-label { font-weight: 600; color: #6b7280; }
              .detail-value { color: #1f2937; }
              .info-box { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              .info-box strong { color: #5b21b6; }
              .info-box p { margin: 8px 0 0 0; font-size: 14px; color: #4c1d95; }
              .tip { color: #6b7280 !important; font-size: 14px !important; margin-top: 16px !important; }
              .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 24px 24px; border-top: 1px solid #e5e7eb; background: #fafafa; }
              .footer p { margin: 4px 0; }
              .footer a { color: #7c3aed; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <div class="card">
                <div class="header">
                  <h1>Your project is live</h1>
                  <p>Freelancers are being notified and can reach out soon.</p>
                </div>
                <div class="content">
                  <p>Your project <strong>“${escapeHtml(gig.title || "Your Project")}”</strong> is confirmed and live on Digs and Gigs.</p>
                  <p>Use the links below to manage it anytime:</p>
                  <div class="actions">
                    <div class="action-row"><a href="${viewUrl}" class="btn btn-primary">View your project</a></div>
                    <div class="action-row"><a href="${editUrl}" class="btn btn-secondary">Edit project details</a></div>
                    <div class="action-row"><a href="${myGigsUrl}" class="btn btn-secondary">View all my projects</a></div>
                    <div class="action-row"><a href="${cancelUrl}" class="btn btn-danger">Cancel this project</a></div>
                  </div>
                  <div class="project-card">
                    <div class="project-title">Project summary</div>
                    <div class="detail-row"><span class="detail-label">Title:</span> <span class="detail-value">${escapeHtml(gig.title || "Your Project")}</span></div>
                    <div class="detail-row"><span class="detail-label">Budget:</span> <span class="detail-value">${escapeHtml(budgetText)}</span></div>
                    <div class="detail-row"><span class="detail-label">Timeline:</span> <span class="detail-value">${escapeHtml(gig.timeline || "Flexible")}</span></div>
                    <div class="detail-row"><span class="detail-label">Location:</span> <span class="detail-value">${escapeHtml(gig.location || "Remote")}</span></div>
                  </div>
                  <div class="info-box">
                    <strong>What happens next?</strong>
                    <p>Qualified freelancers are notified about your project and can unlock your contact details to reach out. You’ll get inquiries by email or phone with quotes and proposals.</p>
                  </div>
                  <p class="tip"><strong>Tip:</strong> Respond quickly when freelancers contact you—it leads to better pricing and faster completion.</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or visit our <a href="${siteUrl}/faq">FAQ</a>.</p>
                  <p>© ${currentYear} Digs and Gigs. All rights reserved.</p>
                  <p><a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(gig.consumer_email)}">Unsubscribe</a></p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("[send-gig-management-email] Resend API error:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
    }

    console.log("[send-gig-management-email] Email sent successfully. Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-gig-management-email] Error:", error);
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
