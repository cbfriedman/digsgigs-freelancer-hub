import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@3.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GigConfirmationRequest {
  gigData: {
    title: string;
    description: string;
    location: string;
    timeline: string;
    budget_min: number;
    budget_max: number;
    consumer_id: string;
    category_id: string;
    deadline: string;
    contact_preferences: string | null;
    consumer_phone: string | null;
    consumer_email: string;
    status: string;
    documents: string[] | null;
    keywords: string[];
    escrow_requested_by_consumer: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { gigData }: GigConfirmationRequest = await req.json();

    console.log("Received gig confirmation request for:", gigData.consumer_email);

    // Generate a unique verification token
    const token = crypto.randomUUID();

    // Store the pending gig data with token in verification_codes table
    const { error: storeError } = await supabaseClient
      .from("verification_codes")
      .insert({
        identifier: gigData.consumer_email,
        code: token,
        code_type: "gig_confirmation",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        metadata: { gigData },
      });

    if (storeError) {
      console.error("Error storing verification token:", storeError);
      throw storeError;
    }

    // Create confirmation URL
    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-gig-confirmation?token=${token}`;

    // Send confirmation email
    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <onboarding@resend.dev>",
      to: [gigData.consumer_email],
      subject: "Confirm Your Gig Posting",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Confirm Your Gig Posting</h1>
          <p>Hello,</p>
          <p>You've requested to post a gig on Digs and Gigs. Please confirm your gig posting by clicking the button below:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #666; font-size: 18px; margin-top: 0;">${gigData.title}</h2>
            <p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${gigData.location}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Timeline:</strong> ${gigData.timeline}</p>
            <p style="color: #666; margin: 5px 0;"><strong>Budget:</strong> $${gigData.budget_min.toLocaleString()} - $${gigData.budget_max.toLocaleString()}</p>
          </div>
          
          <a href="${confirmationUrl}" 
             style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Confirm & Post Gig
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't request this gig posting, you can safely ignore this email.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Best regards,<br>
            The Digs and Gigs Team
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-gig-confirmation function:", error);
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
