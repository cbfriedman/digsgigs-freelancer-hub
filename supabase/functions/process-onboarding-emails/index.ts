import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingEmail {
  id: string;
  user_id: string;
  digger_profile_id: string | null;
  email: string;
  current_step: number;
  step_1_sent_at: string | null;
  step_2_sent_at: string | null;
  step_3_sent_at: string | null;
  step_4_sent_at: string | null;
  step_5_sent_at: string | null;
  step_6_sent_at: string | null;
  step_7_sent_at: string | null;
  completed: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all incomplete onboarding sequences
    const { data: onboardingRecords, error: fetchError } = await supabase
      .from("digger_onboarding_emails")
      .select(`
        *,
        profiles:user_id (
          full_name
        )
      `)
      .eq("completed", false)
      .lt("current_step", 7);

    if (fetchError) {
      throw new Error(`Failed to fetch onboarding records: ${fetchError.message}`);
    }

    if (!onboardingRecords || onboardingRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending onboarding emails", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;
    const now = new Date();

    for (const record of onboardingRecords as any[]) {
      try {
        const currentStep = record.current_step;
        const nextStep = currentStep + 1;

        // Determine which step field to check for timing
        let lastEmailSentAt: Date | null = null;
        let stepField: string = "";

        switch (currentStep) {
          case 1:
            lastEmailSentAt = record.step_1_sent_at ? new Date(record.step_1_sent_at) : null;
            stepField = "step_2_sent_at";
            break;
          case 2:
            lastEmailSentAt = record.step_2_sent_at ? new Date(record.step_2_sent_at) : null;
            stepField = "step_3_sent_at";
            break;
          case 3:
            lastEmailSentAt = record.step_3_sent_at ? new Date(record.step_3_sent_at) : null;
            stepField = "step_4_sent_at";
            break;
          case 4:
            lastEmailSentAt = record.step_4_sent_at ? new Date(record.step_4_sent_at) : null;
            stepField = "step_5_sent_at";
            break;
          case 5:
            lastEmailSentAt = record.step_5_sent_at ? new Date(record.step_5_sent_at) : null;
            stepField = "step_6_sent_at";
            break;
          case 6:
            lastEmailSentAt = record.step_6_sent_at ? new Date(record.step_6_sent_at) : null;
            stepField = "step_7_sent_at";
            break;
        }

        // Check if enough time has passed (1 day = 24 hours)
        if (lastEmailSentAt) {
          const hoursSinceLastEmail = (now.getTime() - lastEmailSentAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastEmail < 24) {
            continue; // Skip if less than 24 hours have passed
          }
        } else if (currentStep === 1) {
          // For step 1, send immediately if not sent yet
          // (This handles the case where the trigger created the record but email wasn't sent)
        } else {
          continue; // Skip if previous step wasn't sent
        }

        // Send the onboarding email
        const { data: emailData, error: emailError } = await supabase.functions.invoke(
          "send-digger-onboarding-email",
          {
            body: {
              userId: record.user_id,
              email: record.email,
              name: record.profiles?.full_name || "",
              step: nextStep,
              diggerProfileId: record.digger_profile_id,
            },
          }
        );

        if (emailError) {
          console.error(`Failed to send onboarding email step ${nextStep} to ${record.email}:`, emailError);
          continue;
        }

        // Update the record
        const updateData: any = {
          current_step: nextStep,
          [stepField]: now.toISOString(),
        };

        if (nextStep === 7) {
          updateData.completed = true;
        }

        const { error: updateError } = await supabase
          .from("digger_onboarding_emails")
          .update(updateData)
          .eq("id", record.id);

        if (updateError) {
          console.error(`Failed to update onboarding record ${record.id}:`, updateError);
          continue;
        }

        emailsSent++;
        console.log(`Sent onboarding email step ${nextStep} to ${record.email}`);
      } catch (error) {
        console.error(`Error processing onboarding record ${record.id}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Onboarding emails processed",
        processed: emailsSent,
        total: onboardingRecords.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-onboarding-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
