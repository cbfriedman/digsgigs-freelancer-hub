import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")?.trim();
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  type: "email";
}

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: VerificationRequest = await req.json();

    console.log("Email verification request received:", { email });

    if (!email) {
      throw new Error("Email is required");
    }

    // Generate 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store verification code in database
    const { data: verificationData, error: dbError } = await supabase
      .from("verification_codes")
      .insert({
        email,
        phone: null,
        code,
        expires_at: expiresAt.toISOString(),
        verification_type: "email",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to store verification code: ${dbError.message}`);
    }

    console.log("Verification code stored:", verificationData.id);

    // Send email via Resend API directly (avoid heavy library deps)
    const emailPayload = {
      from: "digsandgigs <noreply@digsandgigs.net>",
      to: [email],
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p style="color: #666; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Resend API error:", err);
      throw new Error(`Failed to send email: ${emailResponse.status} - ${err}`);
    }

    const emailJson = await emailResponse.json();
    console.log("Email sent successfully:", emailJson);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification code sent to ${email}`,
        verificationId: verificationData.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code function:", error);
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
