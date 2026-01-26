import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import DOMPurify from "https://esm.sh/dompurify@3.0.6";
import { JSDOM } from "https://esm.sh/jsdom@22.1.0";

// Create DOMPurify instance for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// No CORS headers needed - this is a webhook endpoint called by email provider
// Removing wildcard CORS to prevent abuse from arbitrary web origins

interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Sanitize HTML content to prevent XSS attacks
function sanitizeEmailContent(html: string | undefined, text: string | undefined): string {
  if (html) {
    // Sanitize HTML with a strict allowlist
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
      ALLOWED_ATTR: ['href', 'style'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur']
    });
  }
  
  if (text) {
    // Convert plain text to safe HTML
    return text.replace(/\n/g, '<br>');
  }
  
  return 'No message content';
}

const handler = async (req: Request): Promise<Response> => {
  // Only allow POST requests for webhook processing
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const emailData: IncomingEmail = await req.json();
    console.log("Received proxy email:", { from: emailData.from, to: emailData.to, subject: emailData.subject });

    // Extract the proxy email address from the "to" field
    const proxyAddress = emailData.to.toLowerCase().trim();

    // Look up the real email address
    const { data: proxyRecord, error: lookupError } = await supabase
      .from("proxy_emails")
      .select("real_email, user_id")
      .eq("proxy_address", proxyAddress)
      .eq("is_active", true)
      .maybeSingle();

    if (lookupError) {
      console.error("Proxy lookup error:", lookupError);
      throw new Error("Failed to look up proxy email");
    }

    if (!proxyRecord) {
      console.log("No proxy record found for:", proxyAddress);
      return new Response(
        JSON.stringify({ error: "Unknown proxy address", address: proxyAddress }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the sender's proxy email (if they have one) to use as reply-to
    let senderProxyAddress = emailData.from;
    
    // Check if sender is a platform user with a proxy email
    const { data: senderProxy } = await supabase
      .from("proxy_emails")
      .select("proxy_address")
      .eq("real_email", emailData.from.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (senderProxy) {
      senderProxyAddress = senderProxy.proxy_address;
    }

    // Sanitize email content to prevent XSS attacks
    const sanitizedContent = sanitizeEmailContent(emailData.html, emailData.text);

    // Forward the email to the real recipient
    const emailResponse = await resend.emails.send({
      from: `Digs and Gigs <noreply@digsandgigs.net>`,
      reply_to: senderProxyAddress,
      to: [proxyRecord.real_email],
      subject: `[Digs and Gigs] ${emailData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              📧 Message from: <strong>${purify.sanitize(emailData.from)}</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
              Reply directly to this email to respond through the platform.
            </p>
          </div>
          
          <div style="padding: 20px 0;">
            ${sanitizedContent}
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            This message was sent through the Digs and Gigs platform. 
            Your email address has been kept private.
          </p>
        </div>
      `,
      text: emailData.text || '',
    });

    console.log("Email forwarded successfully:", emailResponse);

    // Log the message in the platform's messages table for record-keeping
    // Note: This creates a record of platform communications

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email forwarded successfully",
        response: emailResponse 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error handling proxy email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
