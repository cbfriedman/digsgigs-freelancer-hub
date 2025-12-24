import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sequence timing: Day 0, Day 3, Day 7, Day 14
const STEP_DELAYS_DAYS = [0, 3, 7, 14];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("Starting AI-powered cold email sequence processing...");

    const now = new Date();
    
    // Get all active sequences that are due for next email
    const { data: dueSequences, error: sequenceError } = await supabase
      .from("cold_email_sequence")
      .select(`
        *,
        cold_email_leads(*)
      `)
      .lt("current_step", 4)
      .or(`next_send_at.is.null,next_send_at.lte.${now.toISOString()}`);

    if (sequenceError) {
      console.error("Error fetching sequences:", sequenceError);
      throw sequenceError;
    }

    console.log(`Found ${dueSequences?.length || 0} sequences to process`);

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const sequence of dueSequences || []) {
      const lead = sequence.cold_email_leads;
      
      // Skip if lead is not active
      if (lead.status !== 'active' && lead.status !== 'pending') {
        console.log(`Skipping lead ${lead.id}: status is ${lead.status}`);
        results.skipped++;
        continue;
      }

      // Skip if lead unsubscribed or converted
      if (lead.status === 'unsubscribed' || lead.status === 'converted') {
        console.log(`Skipping lead ${lead.id}: ${lead.status}`);
        results.skipped++;
        continue;
      }

      // Determine next step
      const nextStep = sequence.current_step + 1;
      
      if (nextStep > 4) {
        // Sequence complete
        await supabase
          .from("cold_email_leads")
          .update({ status: 'completed' })
          .eq("id", lead.id);
        results.skipped++;
        continue;
      }

      // Check if enough time has passed since last email
      if (sequence.last_sent_at) {
        const lastSent = new Date(sequence.last_sent_at);
        const daysSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
        const requiredDays = STEP_DELAYS_DAYS[nextStep - 1] - STEP_DELAYS_DAYS[nextStep - 2];
        
        if (daysSinceLastSent < requiredDays) {
          console.log(`Skipping lead ${lead.id}: only ${daysSinceLastSent.toFixed(1)} days since last email, need ${requiredDays}`);
          results.skipped++;
          continue;
        }
      }

      try {
        console.log(`Generating AI email for ${lead.email} (${lead.lead_type}, ${lead.industry || 'general'}, step ${nextStep})`);
        
        // Generate personalized email using AI
        const { data: emailContent, error: generateError } = await supabase.functions.invoke('generate-cold-email', {
          body: {
            leadType: lead.lead_type,
            industry: lead.industry || 'general',
            firstName: lead.first_name,
            step: nextStep,
            leadId: lead.id,
          },
        });

        if (generateError) {
          console.error(`Error generating email for ${lead.email}:`, generateError);
          results.errors.push(`${lead.email}: AI generation failed - ${generateError.message}`);
          continue;
        }

        if (!emailContent?.success) {
          console.error(`AI generation failed for ${lead.email}:`, emailContent?.error);
          results.errors.push(`${lead.email}: ${emailContent?.error || 'Unknown AI error'}`);
          continue;
        }

        // Send the email via Resend
        console.log(`Sending step ${nextStep} email to ${lead.email}`);
        
        const emailResponse = await resend.emails.send({
          from: "Digs and Gigs <hello@digsandgigs.com>",
          to: [lead.email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (emailResponse.error) {
          console.error(`Error sending email to ${lead.email}:`, emailResponse.error);
          results.errors.push(`${lead.email}: ${emailResponse.error.message}`);
          continue;
        }

        // Log the email
        await supabase.from("marketing_email_log").insert({
          email: lead.email,
          email_type: 'cold_outreach',
          reason: `${lead.lead_type}_ai_step_${nextStep}`,
          campaign_name: `cold_${lead.lead_type}_${lead.industry || 'general'}`,
        });

        // Update sequence tracking
        const stepField = `step_${nextStep}_sent_at`;
        const nextStepDelay = nextStep < 4 ? STEP_DELAYS_DAYS[nextStep] - STEP_DELAYS_DAYS[nextStep - 1] : 0;
        const nextSendAt = nextStep < 4 
          ? new Date(now.getTime() + nextStepDelay * 24 * 60 * 60 * 1000).toISOString()
          : null;

        await supabase
          .from("cold_email_sequence")
          .update({
            current_step: nextStep,
            [stepField]: now.toISOString(),
            last_sent_at: now.toISOString(),
            next_send_at: nextSendAt,
          })
          .eq("id", sequence.id);

        // Update lead status to active if it was pending
        if (lead.status === 'pending') {
          await supabase
            .from("cold_email_leads")
            .update({ status: 'active' })
            .eq("id", lead.id);
        }

        // Mark as completed if this was the last step
        if (nextStep === 4) {
          await supabase
            .from("cold_email_leads")
            .update({ status: 'completed' })
            .eq("id", lead.id);
        }

        results.sent++;
        console.log(`Successfully sent AI-generated step ${nextStep} to ${lead.email}`);

      } catch (error: any) {
        console.error(`Error processing lead ${lead.id}:`, error);
        results.errors.push(`${lead.email}: ${error.message}`);
      }

      results.processed++;
    }

    console.log("AI-powered cold email sequence processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-cold-email-sequence:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
