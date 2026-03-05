import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { referral_code, gig_id, referred_email, referred_user_id } = await req.json();

    if (!referral_code) {
      return new Response(JSON.stringify({ error: "Missing referral_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up the referral code to find the referring digger
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referral_code", referral_code)
      .is("referred_gig_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReferral) {
      // Update the existing referral with the gig info
      await supabase
        .from("referrals")
        .update({
          referred_gig_id: gig_id || null,
          referred_email: referred_email || existingReferral.referred_email,
          referred_user_id: referred_user_id || null,
          status: gig_id ? "converted" : "clicked",
        })
        .eq("id", existingReferral.id);

      // Notify the referring digger when a gig was posted (converted)
      if (gig_id && existingReferral.referrer_digger_id) {
        const { data: digger } = await supabase
          .from("digger_profiles")
          .select("user_id")
          .eq("id", existingReferral.referrer_digger_id)
          .single();

        if (digger?.user_id) {
          await supabase.rpc("create_notification", {
            p_user_id: digger.user_id,
            p_type: "referral",
            p_title: "New Referral!",
            p_message: "Someone you referred just posted a project!",
            p_link: "/dashboard",
            p_metadata: { referral_id: existingReferral.id, gig_id },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, referral_id: existingReferral.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find which digger owns this referral code
    // The referral_code format is: digger-{digger_profile_id_first8}
    const { data: allReferrals } = await supabase
      .from("referrals")
      .select("referrer_digger_id")
      .eq("referral_code", referral_code)
      .limit(1);

    const referrerDiggerId = allReferrals?.[0]?.referrer_digger_id;

    if (!referrerDiggerId) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a new referral record
    const { data: newReferral, error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_digger_id: referrerDiggerId,
        referral_code,
        referred_email: referred_email || null,
        referred_user_id: referred_user_id || null,
        referred_gig_id: gig_id || null,
        status: gig_id ? "converted" : "clicked",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Notify the referring digger
    if (referrerDiggerId) {
      const { data: digger } = await supabase
        .from("digger_profiles")
        .select("user_id")
        .eq("id", referrerDiggerId)
        .single();

      if (digger?.user_id) {
        await supabase.rpc("create_notification", {
          p_user_id: digger.user_id,
          p_type: "referral",
          p_title: "New Referral!",
          p_message: gig_id
            ? "Someone you referred just posted a project!"
            : "Someone clicked your referral link!",
          p_link: "/dashboard",
          p_metadata: { referral_id: newReferral.id },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, referral_id: newReferral.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-referral error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
