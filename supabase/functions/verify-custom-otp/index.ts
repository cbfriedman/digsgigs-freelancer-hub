import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

interface VerifyOTPRequest {
  email?: string;
  phone?: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { email, phone, code }: VerifyOTPRequest = requestBody;

    // SECURITY: Input validation
    if (!code) {
      return new Response(
        JSON.stringify({ error: "Verification code is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate code format (6 digits)
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Verification code must be exactly 6 digits" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: "Email or phone number is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format if provided
    if (email && typeof email === 'string') {
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

    // Validate phone format if provided (E.164: +1234567890)
    if (phone && typeof phone === 'string') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone format. Must be in E.164 format (e.g., +1234567890)" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Validate environment variables
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

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // SECURITY: Check rate limiting before verifying code
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_otp_attempt_limit',
      { _email: email || null, _phone: phone || null }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue anyway - don't block if rate limiting fails
    } else if (rateLimitCheck && !rateLimitCheck.allowed) {
      const lockMessage = rateLimitCheck.locked 
        ? rateLimitCheck.message || "Too many failed attempts. Account locked. Please try again later."
        : "Too many failed attempts. Please try again later.";
      
      return new Response(
        JSON.stringify({ 
          error: lockMessage,
          locked: rateLimitCheck.locked || false,
          locked_until: rateLimitCheck.locked_until || null
        }),
        {
          status: 429, // Too Many Requests
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if verification code exists and is valid
    let query = supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("phone", phone);
    }

    const { data: verificationCode, error: fetchError } = await query.single();

    if (fetchError || !verificationCode) {
      console.error("Verification code not found or expired:", fetchError);
      
      // SECURITY: Record failed attempt
      try {
        await supabaseAdmin.rpc('record_otp_failed_attempt', {
          _email: email || null,
          _phone: phone || null
        });
      } catch (recordError) {
        console.error("Error recording failed attempt:", recordError);
        // Continue anyway - don't block if recording fails
      }
      
      const errorMessage = fetchError?.code === 'PGRST116' 
        ? "Invalid or expired verification code. Please request a new code."
        : "Invalid or expired verification code. Please check your code and try again.";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark the code as verified
    const { error: updateError } = await supabaseAdmin
      .from("verification_codes")
      .update({ verified: true })
      .eq("id", verificationCode.id);

    if (updateError) {
      console.error("Error updating verification code:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification status" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Try to find and confirm user if they exist (for existing users)
    // If user doesn't exist, that's OK - they'll be created during registration
    if (email) {
      const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!getUserError && users) {
        const user = users.find(u => u.email === email);
        
        if (user) {
          // User exists - confirm their email
          const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
          );

          if (confirmError) {
            console.error("Error confirming user email:", confirmError);
            // Don't fail - code is still verified
          } else {
            console.log("Email verified and confirmed for existing user:", email);
          }
        } else {
          console.log("Code verified for new user (will be created during registration):", email);
        }
      }
    }

    // SECURITY: Reset attempt counter on successful verification
    try {
      await supabaseAdmin.rpc('reset_otp_attempts', {
        _email: email || null,
        _phone: phone || null
      });
    } catch (resetError) {
      console.error("Error resetting OTP attempts:", resetError);
      // Continue anyway - verification was successful
    }

    const identifier = email || phone || 'unknown';
    console.log("Verification code verified successfully for:", identifier);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Verification code verified successfully" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-custom-otp function:", error);
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
