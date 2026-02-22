import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gigId } = (await req.json()) as { gigId?: string };
    if (!gigId) {
      return new Response(JSON.stringify({ error: "Missing gigId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: gig, error: gigError } = await supabaseAdmin
      .from("gigs")
      .select("id, title, consumer_id, awarded_digger_id, status")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      return new Response(JSON.stringify({ error: "Gig not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gig.consumer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not the gig owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gig.awarded_digger_id) {
      return new Response(JSON.stringify({ error: "Gig has no awarded digger" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("user_id, handle")
      .eq("id", gig.awarded_digger_id)
      .single();

    if (!diggerProfile?.user_id) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gigTitle = (gig.title || "Your gig").slice(0, 50);
    await supabaseAdmin.from("notifications").insert({
      user_id: diggerProfile.user_id,
      type: "reference_received",
      title: "New reference from a client",
      message: `A client left you a verified reference for "${gigTitle}". It appears on your profile as "Verified on DigsandGigs".`,
      link: diggerProfile.handle ? `/p/${diggerProfile.handle}` : "/profile",
      metadata: { gig_id: gigId, reference_from: user.id },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
