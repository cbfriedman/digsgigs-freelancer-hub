import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TELEMARKETER-COMMISSION] ${step}${detailsStr}`);
};

const PERCENTAGE_COMMISSION_RATE = 0.35; // 35%
const FLAT_FEE_COMMISSION = 25; // $25

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

    const { leadPurchaseId, gigId, awardedAt } = await req.json();
    
    if (!leadPurchaseId || !gigId) {
      throw new Error("leadPurchaseId and gigId are required");
    }

    logStep("Processing commission calculation", { 
      leadPurchaseId, 
      gigId,
      awardedAt 
    });

    // Get the lead purchase details
    const { data: leadPurchase, error: purchaseError } = await supabaseClient
      .from("lead_purchases")
      .select("*, gigs!inner(telemarketer_id, lead_source)")
      .eq("id", leadPurchaseId)
      .single();

    if (purchaseError || !leadPurchase) {
      throw new Error(`Lead purchase not found: ${purchaseError?.message}`);
    }

    // Check if this is a telemarketer-sourced lead
    if (!leadPurchase.gigs.telemarketer_id || leadPurchase.gigs.lead_source !== 'telemarketing') {
      logStep("Not a telemarketer-sourced lead, skipping commission", {
        telemarketer_id: leadPurchase.gigs.telemarketer_id,
        lead_source: leadPurchase.gigs.lead_source
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Not a telemarketer-sourced lead",
          commissionCreated: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if lead is exclusive (only exclusive leads earn commissions)
    if (!leadPurchase.is_exclusive) {
      logStep("Non-exclusive lead, no commission", { 
        leadPurchaseId,
        is_exclusive: leadPurchase.is_exclusive 
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Non-exclusive leads do not earn commissions",
          commissionCreated: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const telemarketerIds = leadPurchase.gigs.telemarketer_id;
    const leadPrice = leadPurchase.base_price || leadPurchase.purchase_price;

    logStep("Telemarketer-sourced exclusive lead found", { 
      telemarketer_id: telemarketerIds,
      leadPrice 
    });

    // Get telemarketer profile to check commission preference
    const { data: telemarketerProfile, error: profileError } = await supabaseClient
      .from("telemarketer_profiles")
      .select("*")
      .eq("id", telemarketerIds)
      .single();

    if (profileError || !telemarketerProfile) {
      throw new Error(`Telemarketer profile not found: ${profileError?.message}`);
    }

    // Determine commission type and amount
    const commissionType = telemarketerProfile.commission_preference || 'percentage';
    let commissionAmount: number;
    let commissionPercentage: number | null = null;

    if (commissionType === 'flat_fee') {
      commissionAmount = FLAT_FEE_COMMISSION;
      logStep("Using flat fee commission", { amount: commissionAmount });
    } else {
      commissionPercentage = PERCENTAGE_COMMISSION_RATE * 100; // Store as percentage
      commissionAmount = leadPrice * PERCENTAGE_COMMISSION_RATE;
      logStep("Using percentage commission", { 
        percentage: commissionPercentage,
        amount: commissionAmount 
      });
    }

    // Check if commission already exists for this lead purchase
    const { data: existingCommission, error: existingError } = await supabaseClient
      .from("telemarketer_commissions")
      .select("id")
      .eq("lead_purchase_id", leadPurchaseId)
      .single();

    if (existingCommission) {
      logStep("Commission already exists", { commissionId: existingCommission.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Commission already exists",
          commissionId: existingCommission.id,
          commissionCreated: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create commission record
    const { data: commission, error: commissionError } = await supabaseClient
      .from("telemarketer_commissions")
      .insert({
        telemarketer_id: telemarketerIds,
        lead_purchase_id: leadPurchaseId,
        gig_id: gigId,
        commission_type: commissionType,
        lead_price: leadPrice,
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
        payment_status: "pending",
        awarded_at: awardedAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (commissionError || !commission) {
      throw new Error(`Failed to create commission: ${commissionError?.message}`);
    }

    logStep("Commission created successfully", {
      commissionId: commission.id,
      commissionAmount,
      commissionType,
      paymentStatus: "pending"
    });

    // Create notification for telemarketer
    const { data: telemarketerUser } = await supabaseClient
      .from("telemarketer_profiles")
      .select("user_id")
      .eq("id", telemarketerIds)
      .single();

    if (telemarketerUser) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: telemarketerUser.user_id,
          type: "commission_earned",
          title: "Commission Earned!",
          message: `You earned ${commissionType === 'flat_fee' ? '$25' : '35%'} commission ($${commissionAmount.toFixed(2)}) on an awarded lead.`,
          link: "/telemarketer-dashboard",
          metadata: {
            commission_id: commission.id,
            lead_purchase_id: leadPurchaseId,
            gig_id: gigId,
            commission_amount: commissionAmount,
            commission_type: commissionType,
          },
        });
      
      logStep("Notification sent to telemarketer", { 
        userId: telemarketerUser.user_id 
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        commissionCreated: true,
        commission: {
          id: commission.id,
          amount: commissionAmount,
          type: commissionType,
          paymentStatus: "pending",
        }
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
        status: 400,
      }
    );
  }
});
