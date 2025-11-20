import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK-PROFESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No signature");

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("No webhook secret configured");

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event verified", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const profileId = session.metadata?.profile_id;
      const userId = session.metadata?.user_id;
      const professionsData = session.payment_intent 
        ? await stripe.paymentIntents.retrieve(session.payment_intent as string)
        : null;

      if (!profileId || !userId) {
        throw new Error("Missing metadata in session");
      }

      logStep("Processing completed checkout", { profileId, userId });

      // Parse professions from payment intent metadata
      const professions = professionsData?.metadata?.professions 
        ? JSON.parse(professionsData.metadata.professions)
        : [];

      // Update profile with purchased lead quantities
      const { data: profile, error: profileError } = await supabaseClient
        .from('digger_profiles')
        .select('keywords, monthly_lead_count')
        .eq('id', profileId)
        .single();

      if (profileError) {
        logStep("Error fetching profile", { error: profileError });
        throw profileError;
      }

      // Calculate total leads purchased
      const totalLeads = professions.reduce((sum: number, p: any) => sum + p.quantity, 0);
      const newLeadCount = (profile.monthly_lead_count || 0) + totalLeads;

      // Update keywords array with purchased professions
      const currentKeywords = profile.keywords || [];
      const newKeywords = [...new Set([...currentKeywords, ...professions.map((p: any) => p.keyword)])];

      const { error: updateError } = await supabaseClient
        .from('digger_profiles')
        .update({
          keywords: newKeywords,
          monthly_lead_count: newLeadCount,
          registration_status: 'complete',
        })
        .eq('id', profileId);

      if (updateError) {
        logStep("Error updating profile", { error: updateError });
        throw updateError;
      }

      logStep("Profile updated", { newLeadCount, keywordCount: newKeywords.length });

      // Create notification for the user
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'lead_purchase',
          title: 'Lead Purchase Successful',
          message: `Your purchase of ${totalLeads} leads has been processed. You'll start receiving matching gigs immediately!`,
          link: '/my-leads',
        });

      if (notifError) {
        logStep("Error creating notification", { error: notifError });
      } else {
        logStep("Notification created");
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
