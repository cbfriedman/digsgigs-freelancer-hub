import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    // Find drafts older than 30 minutes that haven't been followed up and have an email
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: drafts, error: fetchError } = await supabase
      .from("gig_drafts")
      .select("*")
      .eq("follow_up_sent", false)
      .eq("converted", false)
      .not("email", "is", null)
      .lt("created_at", cutoff)
      .limit(20);

    if (fetchError) throw fetchError;
    if (!drafts || drafts.length === 0) {
      return new Response(JSON.stringify({ message: "No abandoned drafts to follow up" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const draft of drafts) {
      try {
        // Generate personalized follow-up using AI
        let emailBody = `Hi ${draft.name || "there"},\n\nWe noticed you started posting a project on Digs & Gigs but didn't finish. We'd love to help you find the right pro!\n\nPick up where you left off: https://digsandgigs.net/hire-a-pro\n\nBest,\nThe Digs & Gigs Team`;

        if (lovableKey && draft.description) {
          try {
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: "You are a friendly email copywriter for Digs & Gigs, a freelancer marketplace. Write a brief, warm follow-up email (3-4 sentences max) to someone who started posting a project but didn't finish. Include their project context. End with a call to action to complete their posting at https://digsandgigs.net/hire-a-pro. Do NOT include a subject line. Keep it casual and helpful, not salesy.",
                  },
                  {
                    role: "user",
                    content: `Name: ${draft.name || "Friend"}\nProject types: ${(draft.project_types || []).join(", ")}\nDescription started: ${draft.description || "Not provided"}\nBudget: ${draft.budget_min ? `$${draft.budget_min}-$${draft.budget_max}` : "Not set"}`,
                  },
                ],
              }),
            });
            if (aiResp.ok) {
              const aiData = await aiResp.json();
              const aiContent = aiData.choices?.[0]?.message?.content;
              if (aiContent) emailBody = aiContent;
            }
          } catch (aiErr) {
            console.error("AI generation failed, using default:", aiErr);
          }
        }

        // Send email via Resend
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Digs & Gigs <notify@digsandgigs.net>",
              to: [draft.email],
              subject: "Your project is almost live — finish posting in 2 minutes",
              html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                ${emailBody.replace(/\n/g, "<br>")}
              </div>`,
            }),
          });
        }

        // Mark as followed up
        await supabase
          .from("gig_drafts")
          .update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() })
          .eq("id", draft.id);

        sent++;
      } catch (draftErr) {
        console.error(`Failed to follow up draft ${draft.id}:`, draftErr);
      }
    }

    return new Response(JSON.stringify({ success: true, followed_up: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("follow-up-abandoned-drafts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
