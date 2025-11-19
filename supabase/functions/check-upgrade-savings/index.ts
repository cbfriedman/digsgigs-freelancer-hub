import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-UPGRADE-SAVINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Get all diggers with free or pro tier
    const { data: diggers, error: diggersError } = await supabaseClient
      .from("digger_profiles")
      .select("id, user_id, business_name, subscription_tier, profiles!inner(email)")
      .in("subscription_tier", ["free", "pro"]);

    if (diggersError) {
      logStep("Error fetching diggers", { error: diggersError });
      throw diggersError;
    }

    logStep(`Found ${diggers?.length || 0} diggers to check`);

    const notificationsSent: string[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const digger of diggers || []) {
      const tier = digger.subscription_tier || 'free';
      const email = (digger.profiles as any).email;

      // Get lead purchases in last 30 days
      const { data: leads, error: leadsError } = await supabaseClient
        .from("lead_purchases")
        .select("purchase_price, status")
        .eq("digger_id", digger.id)
        .gte("purchased_at", thirtyDaysAgo.toISOString())
        .eq("status", "completed");

      if (leadsError) {
        logStep(`Error fetching leads for digger ${digger.id}`, { error: leadsError });
        continue;
      }

      const monthlyLeads = leads?.length || 0;
      
      // Get completed transactions to estimate monthly revenue
      const { data: transactions, error: transError } = await supabaseClient
        .from("transactions")
        .select("total_amount, commission_amount")
        .eq("digger_id", digger.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .eq("status", "completed");

      if (transError) {
        logStep(`Error fetching transactions for digger ${digger.id}`, { error: transError });
        continue;
      }

      const monthlyRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      // Calculate current costs
      const leadCosts = { free: 20, pro: 10, premium: 5 };
      const escrowFees = { free: 0.09, pro: 0.08, premium: 0.04 };
      const subscriptions = { free: 0, pro: 99, premium: 599 };

      const currentLeadCost = monthlyLeads * leadCosts[tier as keyof typeof leadCosts];
      const currentEscrowFee = monthlyRevenue * escrowFees[tier as keyof typeof escrowFees];
      const currentSubscription = subscriptions[tier as keyof typeof subscriptions];
      const currentTotal = currentLeadCost + currentEscrowFee + currentSubscription;

      // Calculate costs for next tier up
      let nextTier: 'pro' | 'premium' | null = null;
      if (tier === 'free') nextTier = 'pro';
      else if (tier === 'pro') nextTier = 'premium';

      if (!nextTier) continue;

      const nextLeadCost = monthlyLeads * leadCosts[nextTier];
      const nextEscrowFee = monthlyRevenue * escrowFees[nextTier];
      const nextSubscription = subscriptions[nextTier];
      const nextTotal = nextLeadCost + nextEscrowFee + nextSubscription;

      const savings = currentTotal - nextTotal;

      logStep(`Digger ${digger.id} analysis`, {
        tier,
        nextTier,
        monthlyLeads,
        monthlyRevenue,
        currentTotal,
        nextTotal,
        savings
      });

      // Only send notification if upgrading saves money
      if (savings > 0) {
        const emailHtml = `
          <h1>Save Money by Upgrading to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}!</h1>
          <p>Hi ${digger.business_name},</p>
          
          <p>Based on your activity over the last 30 days, we noticed that upgrading to the <strong>${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</strong> plan would <strong>save you $${savings.toFixed(2)} per month</strong>!</p>
          
          <h2>Your Current Usage:</h2>
          <ul>
            <li><strong>${monthlyLeads} leads purchased</strong></li>
            <li><strong>$${monthlyRevenue.toFixed(2)} in monthly revenue</strong></li>
          </ul>
          
          <h2>Cost Comparison:</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Cost Type</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Current (${tier.charAt(0).toUpperCase() + tier.slice(1)})</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</th>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Subscription</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${currentSubscription}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${nextSubscription}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Lead Costs</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${currentLeadCost.toFixed(2)}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${nextLeadCost.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Escrow Fees</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${currentEscrowFee.toFixed(2)}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${nextEscrowFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Escrow Fees</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${currentEscrowFee.toFixed(2)}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${nextEscrowFee.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Total Monthly Cost</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">$${currentTotal.toFixed(2)}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; color: #10b981;">$${nextTotal.toFixed(2)}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; padding: 15px; background-color: #d1fae5; border-left: 4px solid #10b981;">
            <strong style="color: #065f46;">Monthly Savings: $${savings.toFixed(2)}</strong><br>
            <span style="color: #047857;">Annual Savings: $${(savings * 12).toFixed(2)}</span>
          </p>
          
          <p>Ready to start saving? <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/pricing" style="color: #2563eb; text-decoration: underline;">Upgrade your plan now</a></p>
          
          <p>If you have any questions, feel free to reply to this email.</p>
          
          <p>Best regards,<br>The DigsAndGigs Team</p>
        `;

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "DigsAndGigs <onboarding@resend.dev>",
              to: [email],
              subject: `Save $${savings.toFixed(2)}/month - Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}`,
              html: emailHtml,
            }),
          });

          if (!response.ok) {
            throw new Error(`Resend API error: ${response.statusText}`);
          }

          notificationsSent.push(digger.id);
          logStep(`Notification sent to ${email}`, { diggerId: digger.id, savings });
        } catch (emailError) {
          logStep(`Error sending email to ${email}`, { error: emailError });
        }
      }
    }

    logStep(`Process complete`, { notificationsSent: notificationsSent.length });

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsSent.length,
        diggersChecked: diggers?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
