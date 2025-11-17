import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadPurchaseId, issueType, description } = await req.json();

    if (!leadPurchaseId || !issueType || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get digger profile
    const { data: diggerProfile, error: profileError } = await supabase
      .from('digger_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !diggerProfile) {
      return new Response(
        JSON.stringify({ error: 'Digger profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the lead purchase belongs to this digger
    const { data: leadPurchase, error: purchaseError } = await supabase
      .from('lead_purchases')
      .select('*, gigs(id, title)')
      .eq('id', leadPurchaseId)
      .eq('digger_id', diggerProfile.id)
      .single();

    if (purchaseError || !leadPurchase) {
      return new Response(
        JSON.stringify({ error: 'Lead purchase not found or does not belong to you' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending or approved issue for this lead
    const { data: existingIssue } = await supabase
      .from('lead_issues')
      .select('id, status')
      .eq('lead_purchase_id', leadPurchaseId)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existingIssue) {
      return new Response(
        JSON.stringify({ 
          error: 'A return request already exists for this lead',
          status: existingIssue.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let refundPercentage = 0;
    let autoApprove = false;

    // If the issue is "lead does not match occupation", verify with AI
    if (issueType === 'mismatch') {
      console.log('Verifying lead match with AI...');
      
      const verifyResponse = await supabase.functions.invoke('verify-lead-match', {
        body: {
          gigId: leadPurchase.gig_id,
          diggerProfileId: diggerProfile.id
        }
      });

      if (verifyResponse.error) {
        console.error('AI verification error:', verifyResponse.error);
        // Fall back to manual review if AI fails
        refundPercentage = 0;
      } else {
        const { matches, confidence } = verifyResponse.data;
        
        console.log('AI verification result:', { matches, confidence });

        // If AI determines it doesn't match with high confidence, auto-approve full refund
        if (!matches && confidence === 'high') {
          refundPercentage = 100;
          autoApprove = true;
        } else if (!matches && confidence === 'medium') {
          // Medium confidence: 50% refund
          refundPercentage = 50;
          autoApprove = true;
        }
        // If it matches or low confidence, manual review (0% initially)
      }
    }

    // Create the lead issue
    const { data: issue, error: issueError } = await supabase
      .from('lead_issues')
      .insert({
        lead_purchase_id: leadPurchaseId,
        digger_id: diggerProfile.id,
        issue_type: issueType,
        description: description,
        status: autoApprove ? 'approved' : 'pending',
        refund_percentage: refundPercentage
      })
      .select()
      .single();

    if (issueError) throw issueError;

    // If auto-approved, process the refund immediately
    if (autoApprove && refundPercentage > 0) {
      const refundAmount = (leadPurchase.purchase_price * refundPercentage) / 100;
      
      console.log(`Auto-approving refund of ${refundPercentage}% ($${refundAmount}) for lead purchase ${leadPurchaseId}`);

      // Update lead purchase status
      await supabase
        .from('lead_purchases')
        .update({ status: 'refunded' })
        .eq('id', leadPurchaseId);

      // Create notification for digger
      await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_type: 'lead_return',
        p_title: 'Lead Return Approved',
        p_message: `Your return request for "${leadPurchase.gigs.title}" was automatically approved. ${refundPercentage}% credit ($${refundAmount.toFixed(2)}) has been issued.`,
        p_link: '/my-leads',
        p_metadata: {
          lead_purchase_id: leadPurchaseId,
          issue_id: issue.id,
          refund_percentage: refundPercentage
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          autoApproved: true,
          refundPercentage,
          refundAmount,
          message: `Your return request was automatically approved. ${refundPercentage}% credit ($${refundAmount.toFixed(2)}) has been issued to your account.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Manual review required
    await supabase.rpc('create_notification', {
      p_user_id: user.id,
      p_type: 'lead_return',
      p_title: 'Lead Return Submitted',
      p_message: `Your return request for "${leadPurchase.gigs.title}" has been submitted for review. You'll be notified once it's processed.`,
      p_link: '/my-leads',
      p_metadata: {
        lead_purchase_id: leadPurchaseId,
        issue_id: issue.id
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        autoApproved: false,
        message: 'Your return request has been submitted for review. You will be notified once it has been processed.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-lead-return:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
