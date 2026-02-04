import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = Deno.env.get("BASE_URL") || "https://digsandgigs.net";

interface VapiToolCallMessage {
  message: {
    type: string;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    call?: {
      id: string;
      phoneNumber?: {
        number: string;
      };
    };
  };
}

interface GigDetails {
  problemId?: string;
  clarifyingAnswer?: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  isComplete: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(`[vapi-call-webhook] ${step}`, details ? JSON.stringify(details) : '');
};

// Map problemId to a readable title
function getProblemLabel(problemId: string): string {
  const labels: Record<string, string> = {
    'build-website': 'Website Development',
    'build-webapp': 'Web Application',
    'design': 'Design Services',
    'marketing': 'Marketing',
    'content': 'Content Creation',
    'automation': 'Automation',
    'business-systems': 'Business Systems',
    'other': 'Project',
  };
  return labels[problemId] || 'Project';
}

// Map timeline value to label
function getTimelineLabel(timeline: string): string {
  const labels: Record<string, string> = {
    'asap': 'As soon as possible',
    '1-2-weeks': '1-2 weeks',
    '1-2-months': '1-2 months',
    'exploring': 'Just exploring',
  };
  return labels[timeline] || timeline;
}

async function createGigFromVoice(
  supabase: any,
  details: GigDetails,
  callerPhone: string
): Promise<{ success: boolean; gigId?: string; error?: string }> {
  try {
    const title = `${getProblemLabel(details.problemId || 'other')}${details.clarifyingAnswer ? ` - ${details.clarifyingAnswer}` : ''}`;
    
    const { data: gigData, error: gigError } = await supabase
      .from("gigs")
      .insert({
        title: title,
        description: details.description?.trim() || 'Project submitted via phone call',
        requirements: `Problem: ${getProblemLabel(details.problemId || 'other')}\nDetails: ${details.clarifyingAnswer || 'Not specified'}`,
        budget_min: details.budgetMin || null,
        budget_max: details.budgetMax || null,
        timeline: getTimelineLabel(details.timeline || 'exploring'),
        location: "Remote",
        client_name: details.clientName?.trim() || 'Phone Caller',
        consumer_email: details.clientEmail?.trim() || null,
        consumer_phone: details.clientPhone?.trim() || callerPhone || null,
        status: "open",
        confirmation_status: "confirmed",
        is_confirmed_lead: true,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (gigError) {
      logStep("Error creating gig", { error: gigError.message });
      return { success: false, error: gigError.message };
    }

    logStep("Gig created successfully", { gigId: gigData.id });

    // Send management email
    try {
      await supabase.functions.invoke("send-gig-management-email", {
        body: { gigId: gigData.id }
      });
    } catch (emailErr) {
      logStep("Management email error (non-critical)", { error: String(emailErr) });
    }

    // Send SMS with link to manage the gig
    const phoneToSms = details.clientPhone?.trim() || callerPhone;
    if (phoneToSms) {
      try {
        const projectLink = `${BASE_URL}/my-gigs/${gigData.id}`;
        await supabase.functions.invoke("send-sms", {
          body: {
            templateId: "project_received",
            to: phoneToSms,
            variables: {
              ProjectLink: projectLink,
            },
          },
        });
        logStep("SMS sent successfully", { phone: phoneToSms.slice(0, 5) + '***' });
      } catch (smsErr) {
        logStep("SMS error (non-critical)", { error: String(smsErr) });
      }
    }

    // Blast to PRO diggers
    try {
      await supabase.functions.invoke("blast-lead-to-diggers", {
        body: { leadId: gigData.id, proOnly: true }
      });
    } catch (blastErr) {
      logStep("Pro blast error (non-critical)", { error: String(blastErr) });
    }

    return { success: true, gigId: gigData.id };
  } catch (error) {
    logStep("Exception creating gig", { error: String(error) });
    return { success: false, error: String(error) };
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

    const body: VapiToolCallMessage = await req.json();
    logStep("Received Vapi webhook", { messageType: body.message?.type });

    // Get caller phone number from the call
    const callerPhone = body.message?.call?.phoneNumber?.number || "";

    // Handle tool-calls message type
    if (body.message?.type === "tool-calls" && body.message.toolCallList) {
      const toolCalls = body.message.toolCallList;
      const results = [];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "update_gig_details") {
          const args: GigDetails = JSON.parse(toolCall.function.arguments);
          logStep("Processing update_gig_details", args);

          if (args.isComplete) {
            logStep("Gig details complete, creating gig", args);
            
            const createResult = await createGigFromVoice(supabaseClient, args, callerPhone);
            
            if (createResult.success) {
              results.push({
                toolCallId: toolCall.id,
                result: JSON.stringify({
                  success: true,
                  message: "Project submitted successfully! You'll receive a text message with a link to manage your project.",
                  gigId: createResult.gigId,
                })
              });
            } else {
              results.push({
                toolCallId: toolCall.id,
                result: JSON.stringify({
                  success: false,
                  message: "There was an issue submitting your project. Please try again or visit our website.",
                  error: createResult.error,
                })
              });
            }
          } else {
            // Partial data - acknowledge receipt
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({
                success: true,
                message: "Details updated successfully.",
                fieldsReceived: Object.keys(args).filter(k => args[k as keyof GigDetails] !== undefined && args[k as keyof GigDetails] !== null)
              })
            });
          }
        }
      }

      // Return tool call results in Vapi format
      return new Response(
        JSON.stringify({ results }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Handle end-of-call-report for logging/analytics
    if (body.message?.type === "end-of-call-report") {
      logStep("Call ended", { callId: body.message.call?.id });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default response for other message types
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error processing webhook", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
