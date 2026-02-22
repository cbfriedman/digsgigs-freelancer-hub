import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const { gigId } = (await req.json()) as { gigId: string };
    if (!gigId) throw new Error("Missing gigId");

    const { data: contract, error: contractError } = await supabaseAdmin
      .from("escrow_contracts")
      .select("id, consumer_id, digger_id, gig_id, status")
      .eq("gig_id", gigId)
      .eq("status", "active")
      .maybeSingle();

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ success: false, error: "No active contract found for this gig." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (contract.consumer_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Only the client (Gigger) can end the contract." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { data: milestones, error: mError } = await supabaseAdmin
      .from("milestone_payments")
      .select("id, status")
      .eq("escrow_contract_id", contract.id);

    if (mError || !milestones?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not load milestones." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const allPaid = milestones.every((m) => m.status === "paid");
    if (!allPaid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "All milestones must be paid before you can end the contract.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("escrow_contracts")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", contract.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Mark the gig as completed so it appears in "Completed" for both client and freelancer
    const { data: updatedGigs, error: gigUpdateError } = await supabaseAdmin
      .from("gigs")
      .update({ status: "completed" })
      .eq("id", contract.gig_id)
      .eq("consumer_id", contract.consumer_id)
      .select("id");

    if (gigUpdateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Contract ended but could not update gig status: ${gigUpdateError.message}. Please contact support.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    if (!updatedGigs?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Contract ended but gig could not be marked completed (no matching gig). Please contact support.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contract ended. You and the professional can now leave reviews for each other.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
