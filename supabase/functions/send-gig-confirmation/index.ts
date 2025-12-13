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

    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-gig-confirmation?gigId=${gigId}`;
    
    const budgetText = estimatedBudget 
      ? `$${estimatedBudget.toLocaleString()}`
      : "Budget not specified";

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <noreply@digsandgigs.net>",
      to: [email],
      subject: "Confirm Your Gig Posting - Digs and Gigs",
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
              .warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Confirm Your Gig Posting</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Digs and Gigs</p>
            </div>
            
            <div class="content">
              <p>Hi there,</p>
              
              <p>Thank you for posting a gig on Digs and Gigs! Please review the details below and confirm to make your gig live:</p>
              
              <div class="gig-details">
                <h2 style="margin-top: 0; color: #667eea;">Gig Details</h2>
                
                <div class="detail-row">
                  <span class="detail-label">Title:</span>
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
                    <span class="detail-label">Keywords:</span>
                    <div class="keywords">
                      ${keywords.map(k => `<span class="keyword-badge">${k}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> By confirming this gig, you agree that the information provided is accurate. Confirmed gigs will be matched with qualified professionals in your area.
              </div>
              
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="confirm-button">
                  ✓ Confirm and Post Gig
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>What happens next?</strong><br>
                After you confirm, your gig will be live and matched with qualified professionals who will be able to purchase your lead and contact you with proposals.
              </p>
              
              <div class="footer">
                <p>If you didn't create this gig, please ignore this email.</p>
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
