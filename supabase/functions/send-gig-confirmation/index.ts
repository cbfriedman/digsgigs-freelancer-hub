import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface GigConfirmationRequest {
  gigId: string;
  email: string;
  gigTitle: string;
  gigDescription: string;
  location: string;
  estimatedBudget?: number;
  keywords: string[];
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    const {
      gigId,
      email,
      gigTitle,
      gigDescription,
      location,
      estimatedBudget,
      keywords,
    }: GigConfirmationRequest = await req.json();

    const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";
    const confirmationUrl = `${siteUrl}/review-gig?gigId=${gigId}`;
    
    const budgetText = estimatedBudget 
      ? `$${estimatedBudget.toLocaleString()}`
      : "Budget not specified";

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <noreply@digsandgigs.net>",
      to: [email],
      subject: "Almost there! Confirm your project to get matched with pros 🛠️",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .gig-details {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .detail-row {
                margin: 10px 0;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
              }
              .detail-row:last-child {
                border-bottom: none;
              }
              .detail-label {
                font-weight: bold;
                color: #667eea;
                display: inline-block;
                width: 120px;
              }
              .keywords {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
              }
              .keyword-badge {
                background: #667eea;
                color: white;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 14px;
              }
              .confirm-button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 16px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                text-align: center;
              }
              .confirm-button:hover {
                background: #764ba2;
              }
              .footer {
                text-align: center;
                color: #898989;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
              .tip-box {
                background: #e8f5e9;
                border-left: 4px solid #4caf50;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .next-steps {
                background: #fff3e0;
                border-left: 4px solid #ff9800;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">You're One Click Away!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Let's get you connected with qualified professionals</p>
            </div>
            
            <div class="content">
              <p>Hi there! 👋</p>
              
              <p>Thanks for posting your project on Digs and Gigs! We just need you to confirm the details below, and then we'll start matching you with qualified professionals in your area.</p>
              
              <div class="gig-details">
                <h2 style="margin-top: 0; color: #667eea;">Your Project Details</h2>
                
                <div class="detail-row">
                  <span class="detail-label">Project:</span>
                  <span>${gigTitle}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span>${location}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Budget:</span>
                  <span>${budgetText}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Description:</span>
                  <p style="margin: 10px 0 0 0;">${gigDescription}</p>
                </div>
                
                ${keywords.length > 0 ? `
                  <div class="detail-row">
                    <span class="detail-label">Categories:</span>
                    <div class="keywords">
                      ${keywords.map(k => `<span class="keyword-badge">${k}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="confirm-button">
                  ✓ Confirm & Get Matched
                </a>
              </div>
              
              <div class="next-steps">
                <strong>📋 What happens next?</strong>
                <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Click the button above to confirm your project</li>
                  <li>We'll match you with qualified professionals nearby</li>
                  <li>Pros will reach out with quotes and availability</li>
                  <li>Compare options and choose the best fit for you!</li>
                </ol>
              </div>
              
              <div class="tip-box">
                <strong>💡 Pro tip:</strong> Respond quickly to professionals who contact you! The best pros book up fast, and quick responses lead to better service and pricing.
              </div>
              
              <div class="footer">
                <p>Didn't request this? No worries — just ignore this email and nothing will happen.</p>
                <p>Questions? Reply to this email or visit <a href="https://digsandgigs.net/faq" style="color: #667eea;">our FAQ</a>.</p>
                <p>© 2025 Digs and Gigs. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...getCorsHeaders(origin) 
        },
      }
    );
  }
};

serve(handler);
