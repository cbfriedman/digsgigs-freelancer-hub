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
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
              }
              .container {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
              }
              .content {
                padding: 30px;
              }
              .project-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }
              .project-title {
                font-size: 18px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 15px;
              }
              .detail-row {
                display: flex;
                margin: 8px 0;
              }
              .detail-label {
                font-weight: 600;
                color: #6b7280;
                width: 100px;
                flex-shrink: 0;
              }
              .detail-value {
                color: #1f2937;
              }
              .actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 25px 0;
              }
              .action-button {
                display: inline-block;
                padding: 14px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 15px;
                text-align: center;
              }
              .primary-button {
                background: #667eea;
                color: white;
              }
              .secondary-button {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #e5e7eb;
              }
              .danger-button {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
              }
              .info-box {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                padding: 20px;
                border-top: 1px solid #e5e7eb;
              }
              .footer a {
                color: #667eea;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Your Project is Live! 🎉</h1>
                <p>Freelancers are being notified and will reach out soon</p>
              </div>
              
              <div class="content">
                <p>Great news! Your project "<strong>${gig.title || "Your Project"}</strong>" has been confirmed and is now live on Digs and Gigs.</p>
                
                <p>You can manage your project at any time using the links below:</p>
                
                <div class="actions">
                  <a href="${editUrl}" class="action-button secondary-button">
                    ✏️ Edit Project Details
                  </a>
                  <a href="${cancelUrl}" class="action-button danger-button">
                    ❌ Cancel This Project
                  </a>
                  <a href="${viewUrl}" class="action-button primary-button">
                    👁️ View Your Project
                  </a>
                  <a href="${myGigsUrl}" class="action-button secondary-button" style="background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;">
                    📋 View All My Projects
                  </a>
                </div>
                
                <div class="project-card">
                  <div class="project-title">Project Summary</div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Title:</span>
                    <span class="detail-value">${gig.title || "Your Project"}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Budget:</span>
                    <span class="detail-value">${budgetText}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Timeline:</span>
                    <span class="detail-value">${gig.timeline || "Flexible"}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${gig.location || "Remote"}</span>
                  </div>
                </div>
                
                <div class="info-box">
                  <strong>📬 What happens next?</strong>
                  <p style="margin: 10px 0 0 0;">
                    Qualified freelancers will be notified about your project and can unlock your contact information to reach out directly. 
                    You'll receive inquiries via email or phone with quotes and proposals.
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  <strong>Tip:</strong> Respond promptly when freelancers contact you! 
                  Quick responses lead to better pricing and faster project completion.
                </p>
              </div>
              
              <div class="footer">
                <p>Questions? Reply to this email or visit our <a href="${siteUrl}/faq">FAQ</a>.</p>
                <p>© 2025 Digs and Gigs. All rights reserved.</p>
                <p>
                  <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(gig.consumer_email)}">Unsubscribe</a>
                </p>
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
