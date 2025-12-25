import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Rate limiting configuration
const MAX_REQUESTS_PER_EMAIL = 3;
const RATE_LIMIT_WINDOW_MINUTES = 5;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "https://digsandgigs.net",
  "https://www.digsandgigs.net",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default to a production URL if origin is not allowed or missing

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
};

interface OTPEmailRequest {
  email: string;
  code: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No Content for preflight
      headers: corsHeaders
    });
  }

  // Health check endpoint
  if (req.method === "GET" && new URL(req.url).searchParams.get("health") === "check") {
    const hasResendKey = !!RESEND_API_KEY;
    const hasSupabaseUrl = !!Deno.env.get("SUPABASE_URL");
    const hasServiceKey = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    return new Response(
      JSON.stringify({
        status: "ok",
        function: "send-otp-email",
        timestamp: new Date().toISOString(),
        environment: {
          hasResendKey,
          hasSupabaseUrl,
          hasServiceKey,
          resendKeyFormat: RESEND_API_KEY ? (RESEND_API_KEY.startsWith('re_') ? 'valid' : 'invalid') : 'missing'
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  // Validate RESEND_API_KEY is configured
  if (!RESEND_API_KEY) {
    console.error("CRITICAL: RESEND_API_KEY is not configured in Supabase secrets");
    return new Response(
      JSON.stringify({ 
        error: "Email service is not configured. Please contact support.",
        details: "RESEND_API_KEY secret is missing"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }

  // Validate RESEND_API_KEY format
  if (!RESEND_API_KEY.startsWith('re_')) {
    console.error("CRITICAL: RESEND_API_KEY format is invalid");
    return new Response(
      JSON.stringify({ 
        error: "Email service configuration error. Please contact support.",
        details: "RESEND_API_KEY format is invalid"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }

  try {
    const { email, code, name }: OTPEmailRequest = await req.json();

    // Validate required fields
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CRITICAL: Supabase environment variables not configured");
      return new Response(
        JSON.stringify({ 
          error: "Database service is not configured",
          details: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // === RATE LIMITING ===
    // Check how many OTP requests this email has made in the rate limit window
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

    const { count, error: countError } = await supabase
      .from("verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("created_at", windowStart.toISOString());

    if (countError) {
      console.error("Error checking rate limit:", countError);
      // Continue anyway - don't block legitimate requests due to rate limit check failure
    } else if (count !== null && count >= MAX_REQUESTS_PER_EMAIL) {
      console.warn(`Rate limit exceeded for email: ${email}. Count: ${count}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many verification requests. Please try again in a few minutes.",
          retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60),
            ...corsHeaders 
          },
        }
      );
    }

    console.log(`Rate limit check passed for ${email}. Current count: ${count || 0}/${MAX_REQUESTS_PER_EMAIL}`);

    // Store verification code in database (expires in 5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const { data: insertedCode, error: dbError } = await supabase
      .from("verification_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error storing verification code:", dbError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to store verification code",
          details: dbError.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Verification code stored in database:", insertedCode?.id);

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Digs and Gigs <noreply@digsandgigs.net>",
        to: [email],
        subject: "🔐 Your Verification Code - Digs and Gigs",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Email Verification</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Digs and Gigs</p>
            </div>
            
            <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              ${name ? `<p style="font-size: 16px; color: #333;">Hi ${name},</p>` : '<p style="font-size: 16px; color: #333;">Hi there,</p>'}
              
              <p style="color: #555;">Use the verification code below to complete your sign-in:</p>
              
              <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 10px; margin: 25px 0; border-radius: 10px; border: 2px dashed #667eea; color: #333;">
                ${code}
              </div>
              
              <p style="color: #888; font-size: 14px; text-align: center;">
                ⏱️ This code expires in <strong>5 minutes</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              
              <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 20px;">
                © 2025 Digs and Gigs. All rights reserved.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      let errorMessage = `Resend API error: ${errorText}`;
      let errorDetails = "";
      
      // Try to parse error for better message
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
        
          // Check for domain verification error
          if (errorMessage.includes('domain is not verified') || errorMessage.includes('not verified') || errorMessage.includes('verify a domain')) {
            errorMessage = "Email domain verification required. Please verify digsandgigs.net in Resend.";
            errorDetails = "Go to https://resend.com/domains to add and verify your domain. The test domain can only send to the account owner's email. Domain verification is required to send to any recipient.";
          }
          
          // Check for test domain restriction error
          if (errorMessage.includes('only send testing emails') || errorMessage.includes('testing emails to your own')) {
            errorMessage = "Domain verification required. The test domain can only send to your own email address.";
            errorDetails = "You MUST verify digsandgigs.net in Resend to send emails to other recipients. Go to https://resend.com/domains to add and verify your domain. After verification, update the 'from' address to noreply@digsandgigs.net.";
          }
      } catch {
        // Use the text as-is if not JSON
        if (errorText.includes('domain is not verified') || errorText.includes('not verified')) {
          errorMessage = "Email domain not verified. Please verify digsandgigs.net in Resend.";
          errorDetails = "Go to https://resend.com/domains to add and verify your domain. You can use 'onboarding@resend.dev' for testing.";
        }
      }
      
      console.error("Resend API error:", errorMessage);
      if (errorDetails) {
        console.error("Error details:", errorDetails);
      }
      throw new Error(errorMessage);
    }

    const result = await emailResponse.json();
    console.log("OTP email sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Verification code sent successfully",
      emailId: result.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Failed to send verification code";
    let statusCode = 500;
    
    // Handle specific error types
    if (errorMessage.includes("Resend API")) {
      statusCode = 502; // Bad Gateway
      errorMessage = "Email service temporarily unavailable. Please try again in a moment.";
    } else if (errorMessage.includes("Failed to store")) {
      statusCode = 500;
      errorMessage = "Unable to process verification request. Please try again.";
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      {
        status: statusCode,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);