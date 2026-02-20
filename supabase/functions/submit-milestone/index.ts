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

    const { milestonePaymentId } = (await req.json()) as { milestonePaymentId: string };
    if (!milestonePaymentId) throw new Error("Missing milestonePaymentId");

    // Use service role so we can read the row; then verify the user is the contract's Digger
    const { data: milestone, error: fetchError } = await supabaseAdmin
      .from("milestone_payments")
      .select("id, status, escrow_contract_id, escrow_contracts!inner(digger_id)")
      .eq("id", milestonePaymentId)
      .single();

    if (fetchError || !milestone) throw new Error("Milestone not found");

    const contract = milestone.escrow_contracts as { digger_id: string } | null;
    if (!contract) throw new Error("Contract not found");

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("user_id")
      .eq("id", contract.digger_id)
      .single();

    if (!diggerProfile || diggerProfile.user_id !== user.id) {
      throw new Error("Only the Digger on this contract can submit this milestone");
    }

    if (milestone.status !== "pending") {
      throw new Error(`Milestone cannot be submitted (current status: ${milestone.status})`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("milestone_payments")
      .update({ status: "submitted" })
      .eq("id", milestonePaymentId)
      .eq("status", "pending");

    if (updateError) throw new Error(updateError.message);

    return new Response(
      JSON.stringify({ success: true, message: "Milestone submitted for review." }),
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
