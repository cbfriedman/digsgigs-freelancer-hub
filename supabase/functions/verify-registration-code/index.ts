import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  identifier: string; // email or phone
  code: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, code }: VerifyCodeRequest = await req.json();

    if (!identifier || !code) {
      throw new Error("Identifier and code are required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if identifier is email or phone and query accordingly
    const isEmail = identifier.includes("@");
    
    const query = supabase
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .eq("verification_type", "registration")
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    // Add email or phone filter
    if (isEmail) {
      query.eq("email", identifier);
    } else {
      query.eq("phone", identifier);
    }

    const { data: verificationData, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error("Database error:", fetchError);
      throw new Error("Failed to verify code");
    }

    if (!verificationData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired verification code" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark code as verified
    const { error: updateError } = await supabase
      .from("verification_codes")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", verificationData.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update verification status");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification successful" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-registration-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
