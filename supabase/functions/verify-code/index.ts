import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email?: string;
  phone?: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, code }: VerifyRequest = await req.json();

    console.log("Verification attempt:", { email, phone, codeProvided: !!code });

    if (!code) {
      throw new Error("Verification code is required");
    }

    if (!email && !phone) {
      throw new Error("Email or phone is required");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the verification code
    let query = supabase
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString());

    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("phone", phone);
    }

    const { data: verificationData, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Error verifying code");
    }

    if (!verificationData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired verification code" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark code as verified
    const { error: updateError } = await supabase
      .from("verification_codes")
      .update({ verified: true })
      .eq("id", verificationData.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Error updating verification status");
    }

    console.log("Code verified successfully:", verificationData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification successful",
        verified: true 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-code function:", error);
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
