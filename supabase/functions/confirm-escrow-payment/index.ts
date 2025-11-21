import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { escrowContractId, paymentIntentId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment not completed");
    }

    // Update escrow contract status
    const { data: contract, error: updateError } = await supabaseClient
      .from("escrow_contracts")
      .update({
        status: "funded",
        funded_at: new Date().toISOString(),
      })
      .eq("id", escrowContractId)
      .eq("consumer_id", user.id)
      .select(`
        *,
        gigs!inner(id, awarded_at)
      `)
      .single();

    if (updateError) throw updateError;

    // Award the lead if not already awarded
    if (contract && !contract.gigs.awarded_at) {
      console.log("Awarding lead via escrow payment", { 
        escrowContractId, 
        gigId: contract.gig_id,
        diggerId: contract.digger_id 
      });
      
      try {
        // Find the bid associated with this escrow
        const { data: bid } = await supabaseClient
          .from("bids")
          .select("id")
          .eq("gig_id", contract.gig_id)
          .eq("digger_id", contract.digger_id)
          .single();

        await supabaseClient.functions.invoke("award-lead", {
          body: {
            gigId: contract.gig_id,
            diggerId: contract.digger_id,
            bidId: bid?.id,
            awardMethod: "escrow_payment",
          },
        });
        console.log("Lead awarded successfully via escrow");
      } catch (awardError) {
        console.error("Error awarding lead:", awardError);
        // Don't fail the escrow confirmation if award fails
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});