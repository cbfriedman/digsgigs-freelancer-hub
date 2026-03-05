import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Minimum age of draft before sending follow-up (e.g. 24 hours) */
const DRAFT_AGE_HOURS = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cutoff = new Date(Date.now() - DRAFT_AGE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: drafts, error: fetchError } = await supabase
      .from("gig_drafts")
      .select("id, email, name")
      .eq("converted", false)
      .eq("follow_up_sent", false)
      .not("email", "is", null)
      .lt("created_at", cutoff)
      .limit(100);

    if (fetchError) {
      console.error("follow-up-abandoned-drafts: fetch error", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sent: string[] = [];
    const functionsUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;

    for (const draft of drafts ?? []) {
      if (!draft.email?.trim()) continue;

      try {
        const res = await fetch(`${functionsUrl}/send-reengagement-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            email: draft.email.trim(),
            name: draft.name ?? undefined,
            reason: "abandoned_project",
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.warn(`follow-up-abandoned-drafts: send-reengagement failed for draft ${draft.id}:`, res.status, text);
          continue;
        }

        await supabase
          .from("gig_drafts")
          .update({
            follow_up_sent: true,
            follow_up_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id);

        sent.push(draft.id);
      } catch (e) {
        console.warn(`follow-up-abandoned-drafts: error for draft ${draft.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sent.length, draft_ids: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("follow-up-abandoned-drafts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
