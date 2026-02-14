import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMS_TEMPLATES, renderSmsTemplate, SmsTemplateId } from "../_shared/smsTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const BASE_URL = Deno.env.get("BASE_URL") || "https://digsandgigs.net";

interface SendSmsRequest {
  templateId: SmsTemplateId;
  to: string;
  variables?: Record<string, string>;
  userId?: string;
  // For custom messages (bypasses template)
  customMessage?: string;
}

async function sendTwilioSMS(to: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("[SEND-SMS] Twilio credentials not configured");
    return { success: false, error: "Twilio credentials not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  // Format phone number to E.164 if not already
  let formattedPhone = to.replace(/\D/g, '');
  if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
    formattedPhone = '1' + formattedPhone;
  }
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  const body = new URLSearchParams({
    To: formattedPhone,
    From: TWILIO_PHONE_NUMBER,
    Body: message,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[SEND-SMS] Twilio error:", result);
      return { success: false, error: result.message || "Twilio API error" };
    }

    console.log("[SEND-SMS] Message sent successfully, SID:", result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error("[SEND-SMS] Error sending SMS:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { templateId, to, variables = {}, userId, customMessage }: SendSmsRequest = await req.json();

    console.log("[SEND-SMS] Processing request:", { templateId, to: to?.slice(0, 5) + '***', userId });

    // Validate phone number
    if (!to) {
      throw new Error("Phone number is required");
    }

    let message: string;

    if (customMessage) {
      // Custom message (for one-off sends)
      message = customMessage;
    } else if (templateId) {
      // Template-based message
      const template = SMS_TEMPLATES[templateId];
      if (!template) {
        throw new Error(`Invalid template ID: ${templateId}`);
      }

      // Add default links based on variables needed
      const defaultVariables: Record<string, string> = {
        ProfileLink: `${BASE_URL}/my-profiles?mode=create`,
        CategoriesLink: `${BASE_URL}/my-profiles?mode=create`,
        LeadLink: `${BASE_URL}/browse-gigs`,
        LeadFeedLink: `${BASE_URL}/browse-gigs`,
        BillingLink: `${BASE_URL}/subscription`,
        BoostLink: `${BASE_URL}/subscription#boost`,
        BadgeLink: `${BASE_URL}/subscription#badge`,
        DominanceLink: `${BASE_URL}/subscription#dominance`,
        PricingLink: `${BASE_URL}/pricing`,
        ProjectLink: `${BASE_URL}/my-gigs`,
        BrowseLink: `${BASE_URL}/browse-diggers`,
        EmailLink: `${BASE_URL}/email-preferences`,
      };

      // Merge default variables with provided ones
      const mergedVariables = { ...defaultVariables, ...variables };
      
      message = renderSmsTemplate(templateId, mergedVariables);
    } else {
      throw new Error("Either templateId or customMessage is required");
    }

    // Check message length (carrier compliance)
    if (message.length > 320) {
      console.warn("[SEND-SMS] Message exceeds 320 chars, may be split into multiple segments");
    }

    // Send the SMS
    const result = await sendTwilioSMS(to, message);

    if (!result.success) {
      throw new Error(result.error || "Failed to send SMS");
    }

    // Log the SMS send for analytics
    try {
      await supabaseClient
        .from("sms_logs")
        .insert({
          user_id: userId || null,
          template_id: templateId || 'custom',
          phone_hash: to ? btoa(to.slice(-4)) : null, // Hash for privacy
          sent_at: new Date().toISOString(),
          twilio_sid: result.sid,
          status: 'sent',
        });
    } catch (logError) {
      // Don't fail if logging fails
      console.warn("[SEND-SMS] Failed to log SMS:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "SMS sent successfully",
        sid: result.sid,
        templateId,
        charCount: message.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-SMS] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
