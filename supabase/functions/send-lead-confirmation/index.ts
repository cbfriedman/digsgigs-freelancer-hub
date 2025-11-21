import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@3.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { gigId } = await req.json();

    console.log("[SEND-LEAD-CONFIRMATION] Processing gig:", gigId);

    // Fetch gig details with consumer info
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select(`
        *,
        profiles!gigs_consumer_id_fkey (
          email,
          full_name
        )
      `)
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Failed to fetch gig: ${gigError?.message}`);
    }

    const consumerEmail = gig.profiles?.email;
    const consumerName = gig.profiles?.full_name || "Customer";
    const confirmationMethod = gig.confirmation_method_preference || "email";

    // Generate confirmation code (6-digit)
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store confirmation code temporarily (you might want to create a separate table for this)
    const { error: updateError } = await supabaseClient
      .from("gigs")
      .update({
        confirmation_sent_at: new Date().toISOString(),
        // Store confirmation code in metadata for verification
        contact_preferences: confirmationCode, // Temporary storage
      })
      .eq("id", gigId);

    if (updateError) {
      throw new Error(`Failed to update gig: ${updateError.message}`);
    }

    // Send confirmation based on preference
    if (confirmationMethod === "email" && consumerEmail) {
      const { error: emailError } = await resend.emails.send({
        from: "FindGig <noreply@resend.dev>",
        to: [consumerEmail],
        subject: "Confirm Your Service Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Confirm Your Service Request</h1>
            <p>Hi ${consumerName},</p>
            <p>Thank you for submitting your service request: <strong>${gig.title}</strong></p>
            <p>To confirm and activate your request, please use the following confirmation code:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${confirmationCode}
            </div>
            <p>Enter this code on the confirmation page to activate your request.</p>
            <p><strong>Why confirm?</strong> Confirmed leads ensure serious requests and help us connect you with the best professionals.</p>
            <p>If you didn't submit this request, please ignore this email.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px;">FindGig - Connecting you with skilled professionals</p>
          </div>
        `,
      });

      if (emailError) {
        console.error("[SEND-LEAD-CONFIRMATION] Email error:", emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log("[SEND-LEAD-CONFIRMATION] Confirmation email sent to:", consumerEmail);
    } else if (confirmationMethod === "sms" && gig.consumer_phone) {
      // TODO: Implement SMS sending (requires Twilio or similar service)
      console.log("[SEND-LEAD-CONFIRMATION] SMS not yet implemented, would send to:", gig.consumer_phone);
      console.log("[SEND-LEAD-CONFIRMATION] Confirmation code:", confirmationCode);
      
      // For now, fall back to email if available
      if (consumerEmail) {
        const { error: emailError } = await resend.emails.send({
          from: "FindGig <noreply@resend.dev>",
          to: [consumerEmail],
          subject: "Confirm Your Service Request",
          html: `
            <p>Your confirmation code is: <strong>${confirmationCode}</strong></p>
            <p>Note: SMS delivery is not yet available. We've sent this via email instead.</p>
          `,
        });

        if (emailError) {
          throw new Error(`Failed to send fallback email: ${emailError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation sent successfully",
        confirmationCode, // Return for testing purposes
        method: confirmationMethod,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-LEAD-CONFIRMATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});