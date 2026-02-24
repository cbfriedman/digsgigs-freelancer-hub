import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[PEWC] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullName = body.fullName as string | undefined;
    const phone = body.phone as string | undefined;
    const email = body.email as string | undefined;
    const propertyAddress = body.propertyAddress as string | undefined;
    const consentText = body.consentText as string | undefined;
    const consentVersion = body.consentVersion as string | undefined;
    const userAgent = body.userAgent as string | undefined;
    const pageUrl = body.pageUrl as string | undefined;
    const utmSource = body.utmSource as string | undefined;
    const utmMedium = body.utmMedium as string | undefined;
    const utmCampaign = body.utmCampaign as string | undefined;

    // Validate required fields
    if (!phone || !consentText || !pageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, consentText, pageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (E.164)
    const phoneRegex = /^\+1[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Use E.164 format: +1XXXXXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get real IP from headers (Cloudflare, Supabase Edge, etc.)
    const realIp = 
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`[PEWC] Storing consent for phone: ${phone.slice(-4)}, IP: ${realIp}`);

    // Check if this phone already has a recent pending consent (to prevent spam)
    const { data: existingConsent } = await supabase
      .from("consent_records")
      .select("id, sms_verified, created_at")
      .eq("phone", phone)
      .eq("consent_revoked", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingConsent && existingConsent.length > 0) {
      const existing = existingConsent[0];
      const createdAt = new Date(existing.created_at);
      const now = new Date();
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // If verified within last 24 hours, skip re-verification
      if (existing.sms_verified && minutesSinceCreation < 1440) {
        console.log(`[PEWC] Phone already verified within 24 hours`);
        return new Response(
          JSON.stringify({ 
            consentRecordId: existing.id,
            alreadyVerified: true,
            message: "Phone already verified. You're all set!"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If unverified and very recent (within 1 minute), rate limit
      if (!existing.sms_verified && minutesSinceCreation < 1) {
        console.log(`[PEWC] Rate limited - too many requests`);
        return new Response(
          JSON.stringify({ error: "Please wait before requesting another code" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert consent record
    const { data: consentRecord, error: insertError } = await supabase
      .from("consent_records")
      .insert({
        phone,
        email: email || null,
        full_name: fullName || null,
        property_address: propertyAddress || null,
        consent_text: consentText,
        consent_version: consentVersion || "1.0",
        ip_address: realIp,
        user_agent: userAgent || null,
        page_url: pageUrl,
        sms_verification_code: verificationCode,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[PEWC] Insert error:", insertError);
      const message = insertError.message || "Failed to store consent record";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PEWC] Consent record created: ${consentRecord.id}`);

    // Send SMS verification code via Resend (we'll use email for now since SMS requires Twilio)
    // In production, integrate Twilio or similar SMS provider
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey && email) {
      // Send verification code via email as fallback
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Digs and Gigs <noreply@digsandgigs.net>",
            to: [email],
            subject: "Your Verification Code",
            html: `
              <h2>Your Verification Code</h2>
              <p>Use this code to verify your phone number:</p>
              <h1 style="font-size: 36px; letter-spacing: 8px; font-weight: bold;">${verificationCode}</h1>
              <p>This code expires in 10 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("[PEWC] Email send failed:", await emailResponse.text());
        } else {
          console.log("[PEWC] Verification email sent");
        }
      } catch (emailError) {
        console.error("[PEWC] Email send error:", emailError);
      }
    }

    // TODO: Integrate Twilio or similar for actual SMS sending
    // For now, log the code for testing
    console.log(`[PEWC] Verification code for ${phone.slice(-4)}: ${verificationCode}`);

    return new Response(
      JSON.stringify({
        consentRecordId: consentRecord.id,
        message: "Consent recorded. Please verify with the code sent to your phone.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PEWC] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
