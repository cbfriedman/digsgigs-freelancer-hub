import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TRANSACTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { bidId, totalAmount, stripePaymentIntentId } = await req.json();

    if (!bidId || !totalAmount) {
      throw new Error('Missing required parameters: bidId and totalAmount');
    }

    logStep("Parameters received", { bidId, totalAmount, stripePaymentIntentId });

    // Get bid details with related data
    const { data: bid, error: bidError } = await supabaseClient
      .from('bids')
      .select(`
        id,
        gig_id,
        digger_id,
        amount,
        status,
        gigs (
          id,
          consumer_id,
          title
        )
      `)
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      throw new Error('Bid not found');
    }

    logStep("Bid found", { bid });

    // Verify user is authorized (either consumer or digger)
    const gigConsumerId = (bid.gigs as any)?.consumer_id;
    const { data: diggerProfile } = await supabaseClient
      .from('digger_profiles')
      .select('user_id, subscription_tier')
      .eq('id', bid.digger_id)
      .single();

    const diggerUserId = diggerProfile?.user_id;

    if (user.id !== gigConsumerId && user.id !== diggerUserId) {
      throw new Error('Unauthorized: You must be the gig owner or the digger');
    }

    logStep("Authorization verified", { gigConsumerId, diggerUserId });

    // Get digger's subscription tier for escrow fee (not commission anymore)
    const tier = diggerProfile?.subscription_tier || 'free';
    
    // Escrow fees are tier-based: 9%/8%/4%
    // No commission or award fees - only escrow fees apply
    const escrowFeeRates = { free: 0.09, pro: 0.08, premium: 0.04 };
    const escrowFeeRate = escrowFeeRates[tier as keyof typeof escrowFeeRates] || 0.09;
    const escrowFeeAmount = Math.max(10, totalAmount * escrowFeeRate);
    const diggerPayout = totalAmount - escrowFeeAmount;

    logStep("Escrow fee calculated", {
      tier,
      escrowFeeRate,
      totalAmount,
      escrowFeeAmount,
      diggerPayout
    });

    // Create transaction
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        bid_id: bidId,
        gig_id: bid.gig_id,
        digger_id: bid.digger_id,
        consumer_id: gigConsumerId,
        total_amount: totalAmount,
        commission_rate: escrowFeeRate,
        commission_amount: escrowFeeAmount,
        digger_payout: diggerPayout,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      logStep("Transaction creation error", { error: transactionError });
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    logStep("Transaction created", { transactionId: transaction.id });

    // Update bid status to completed
    const { error: updateBidError } = await supabaseClient
      .from('bids')
      .update({ status: 'completed' })
      .eq('id', bidId);

    if (updateBidError) {
      logStep("Bid update error", { error: updateBidError });
      // Don't fail the transaction if bid update fails
    }

    // Update gig status to completed
    const { error: updateGigError } = await supabaseClient
      .from('gigs')
      .update({ status: 'completed' })
      .eq('id', bid.gig_id);

    if (updateGigError) {
      logStep("Gig update error", { error: updateGigError });
      // Don't fail the transaction if gig update fails
    }

    logStep("Transaction flow completed successfully");

    return new Response(JSON.stringify({
      success: true,
      transaction: {
        id: transaction.id,
        total_amount: totalAmount,
        commission_rate: escrowFeeRate,
        commission_amount: escrowFeeAmount,
        digger_payout: diggerPayout,
        tier: tier
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
