import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "https://digsandgigs.net",
  "https://www.digsandgigs.net",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

interface OTPRequest {
  email?: string;
  phone?: string;
  code: string;
  name?: string;
  method: 'email' | 'sms';
}

async function sendTwilioSMS(to: string, message: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }

  return await response.json();
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
        function: "send-otp",
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

  try {
    console.log("=== send-otp function called ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    
    // Parse request body with error handling
    let requestBody: OTPRequest;
    try {
      requestBody = await req.json();
      console.log("Parsed request body:", { 
        email: requestBody.email, 
        hasPhone: !!requestBody.phone,
        codeLength: requestBody.code?.length,
        hasName: !!requestBody.name,
        method: requestBody.method 
      });
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format",
          details: "Request body must be valid JSON",
          parseError: parseError?.message
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email, phone, code, name, method } = requestBody;
    
    // Validate method is provided
    if (!method) {
      console.error("Method is missing from request");
      return new Response(
        JSON.stringify({ 
          error: "Method is required",
          details: "Please specify 'email' or 'sms' as the verification method"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Processing OTP request:", { email, method, codeLength: code?.length });

    // Validate required fields
    if (!code) {
      return new Response(
        JSON.stringify({ error: "Code is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (method === 'email' && !email) {
      return new Response(
        JSON.stringify({ error: "Email is required for email verification" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (method === 'sms' && !phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required for SMS verification" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format if email method
    if (method === 'email' && email) {
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
    }

    // Validate phone format if SMS method
    if (method === 'sms' && phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format. Use international format (e.g., +1234567890)" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Create Supabase client to store verification code
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 10) + "..."
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CRITICAL: Supabase environment variables not configured", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          error: "Database service is not configured",
          details: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Please check Supabase function secrets."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Validate service key format
    if (!supabaseServiceKey.startsWith('eyJ') && !supabaseServiceKey.includes('service_role')) {
      console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY format appears invalid");
      return new Response(
        JSON.stringify({ 
          error: "Database service configuration error",
          details: "SUPABASE_SERVICE_ROLE_KEY format is invalid. Please check Supabase function secrets."
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

    // Store verification code in database (expires in 5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Map 'sms' to 'phone' for database compatibility (table constraint uses 'phone')
    const dbVerificationType = method === 'sms' ? 'phone' : method;
    
    console.log("Attempting to insert verification code:", {
      email: method === 'email' ? email : null,
      phone: method === 'sms' ? phone : null,
      method,
      dbVerificationType,
      codeLength: code.length
    });

    const { data: insertedCode, error: dbError } = await supabase
      .from("verification_codes")
      .insert({
        email: method === 'email' ? email?.toLowerCase() : null,
        phone: method === 'sms' ? phone : null,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        verification_type: dbVerificationType,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error storing verification code:", {
        error: dbError,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      return new Response(
        JSON.stringify({ 
          error: "Failed to store verification code",
          details: dbError.message,
          hint: dbError.hint || "Check database constraints and RLS policies"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Verification code stored in database:", insertedCode?.id);

    // Send OTP via the selected method
    if (method === 'email') {
      if (!RESEND_API_KEY) {
        console.error("CRITICAL: RESEND_API_KEY is not configured in Supabase secrets");
        return new Response(
          JSON.stringify({ 
            error: "Email service is not configured. Please contact support.",
            details: "RESEND_API_KEY secret is missing"
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
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
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Log API key info for debugging (first 10 chars only for security)
      console.log("Resend API Key Info:", {
        prefix: RESEND_API_KEY.substring(0, 10) + "...",
        length: RESEND_API_KEY.length,
        note: "If you see test mode errors, ensure you're using a PRODUCTION API key from https://resend.com/api-keys"
      });

      // Use Resend SDK instead of direct fetch
      const resend = new Resend(RESEND_API_KEY);
      
      try {
        const emailResponse = await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [email!],
          subject: "Your Verification Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">Digs and Gigs</h1>
              <h2>Verification Code</h2>
              ${name ? `<p>Hi ${name},</p>` : '<p>Hi there,</p>'}
              <p>Your verification code is:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
              <p>Best regards,<br>The Digs and Gigs Team</p>
            </div>
          `,
        });

        if (emailResponse.error) {
          let errorMessage = emailResponse.error.message || "Failed to send email";
          let errorDetails = "";
          
          // Check for test mode restriction
          if (errorMessage.includes('only send testing emails') || 
              errorMessage.includes('testing emails to your own') ||
              errorMessage.includes('test domain')) {
            errorMessage = "Resend API key is in TEST mode. A PRODUCTION API key is required.";
            errorDetails = `The current Resend API key is a TEST key that only allows sending to the account owner's email (coby@cfcontracting.com). 

CRITICAL: Even though your domain (digsandgigs.net) is verified, TEST API keys have restrictions.

To fix this:
1. Go to https://resend.com/api-keys
2. Create a NEW PRODUCTION API key (not a test key)
3. Copy the production key (starts with 're_')
4. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
5. Update the RESEND_API_KEY secret with the PRODUCTION key
6. Redeploy the send-otp function (or wait a few minutes for secrets to refresh)
7. Test again

Note: Test keys and production keys look the same but have different permissions. Make sure you're creating a PRODUCTION key, not a test key.`;
            console.error("=== RESEND TEST MODE ERROR ===");
            console.error("Error message:", errorMessage);
            console.error("Full error details:", errorDetails);
            console.error("API Key prefix:", RESEND_API_KEY.substring(0, 10) + "...");
            console.error("Domain status: Verified (digsandgigs.net)");
            console.error("Action required: Replace test API key with production API key");
            throw new Error(errorMessage);
          }
          
          // Check for domain verification error
          if (errorMessage.includes('domain is not verified') || 
              errorMessage.includes('not verified') || 
              errorMessage.includes('verify a domain')) {
            errorMessage = "Email domain verification required. Please verify digsandgigs.net in Resend.";
            errorDetails = "Go to https://resend.com/domains to add and verify your domain. The test domain can only send to the account owner's email. Domain verification is required to send to any recipient.";
            console.error("Resend domain verification error:", errorMessage);
            if (errorDetails) {
              console.error("Error details:", errorDetails);
            }
            throw new Error(errorMessage);
          }
          
          console.error("Resend API error:", errorMessage);
          throw new Error(errorMessage);
        }

        console.log("OTP email sent successfully:", emailResponse.data);

        return new Response(JSON.stringify({ 
          success: true, 
          method: 'email',
          message: "Verification code sent successfully",
          emailId: emailResponse.data?.id 
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (resendError: any) {
        // Re-throw Resend SDK errors with better context
        console.error("Resend SDK error:", resendError);
        throw resendError;
      }
    } else if (method === 'sms') {
      // Check if Twilio is configured before attempting to send
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.error("Twilio is not configured. Missing secrets:", {
          hasAccountSid: !!TWILIO_ACCOUNT_SID,
          hasAuthToken: !!TWILIO_AUTH_TOKEN,
          hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
        });
        return new Response(
          JSON.stringify({ 
            error: "SMS service is not configured. Please use email verification or contact support.",
            details: "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not set in Supabase secrets."
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      try {
        const smsMessage = `Digs and Gigs: Your verification code is ${code}. This code expires in 5 minutes.`;
        await sendTwilioSMS(phone!, smsMessage);
        console.log("OTP SMS sent successfully to:", phone);
        
        return new Response(JSON.stringify({ success: true, method: 'sms' }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (smsError: any) {
        console.error("SMS sending error:", smsError);
        const errorMessage = smsError.message || "Failed to send SMS";
        return new Response(
          JSON.stringify({ 
            error: "Failed to send SMS. Please check your phone number or try email verification.",
            details: errorMessage
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid verification method. Use 'email' or 'sms'" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    // Log full error details for debugging
    if (error?.cause) {
      console.error("Error cause:", error.cause);
    }
    
    // Provide more helpful error messages
    let errorMessage = error?.message || "Failed to send verification code";
    let statusCode = 500;
    let errorDetails: any = { success: false };
    
    // Handle specific error types
    if (errorMessage.includes("Resend API") || errorMessage.includes("Resend")) {
      statusCode = 502; // Bad Gateway
      errorMessage = "Email service temporarily unavailable. Please try again in a moment.";
      errorDetails.resendError = true;
    } else if (errorMessage.includes("Failed to store") || errorMessage.includes("database") || errorMessage.includes("constraint")) {
      statusCode = 500;
      errorMessage = "Unable to process verification request. Please check database configuration.";
      errorDetails.databaseError = true;
    } else if (errorMessage.includes("Twilio")) {
      statusCode = 502;
      errorMessage = "SMS service temporarily unavailable. Please try email verification.";
      errorDetails.twilioError = true;
    } else {
      // For unknown errors, include more details in development
      if (Deno.env.get("ENVIRONMENT") === "development" || !Deno.env.get("ENVIRONMENT")) {
        errorDetails.debug = {
          name: error?.name,
          message: error?.message,
          stack: error?.stack?.split('\n').slice(0, 5) // First 5 lines of stack
        };
      }
    }
    
    errorDetails.error = errorMessage;
    
    return new Response(
      JSON.stringify(errorDetails),
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

// Wrap handler to catch any unhandled errors at the top level
const wrappedHandler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    return await handler(req);
  } catch (error: any) {
    console.error("=== UNHANDLED ERROR IN send-otp ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Request method:", req.method);
    console.error("Request URL:", req.url);
    
    // Try to get request body for debugging (but don't fail if it's already consumed)
    try {
      const clonedReq = req.clone();
      const body = await clonedReq.text();
      console.error("Request body:", body);
    } catch (e) {
      console.error("Could not read request body:", e);
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error?.message || "An unexpected error occurred",
        success: false,
        details: process.env.DENO_ENV === "development" ? error?.stack : undefined
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
};

// Serve with error handling
serve(wrappedHandler);


