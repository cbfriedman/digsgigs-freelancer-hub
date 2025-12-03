import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyOTPRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
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

    // Check if verification code exists and is valid
    const { data: verificationCode, error: fetchError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationCode) {
      console.error("Verification code not found or expired:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
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

    console.log("Verification code verified successfully for:", email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email verified successfully" 
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
