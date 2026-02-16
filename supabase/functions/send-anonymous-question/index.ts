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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gigId, bidId, diggerId, message } = await req.json();

    if (!gigId || !bidId || !diggerId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: gigId, bidId, diggerId, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length < 10 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message must be between 10 and 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing anonymous question from user ${user.id} for gig ${gigId}`);

    // Verify user owns the gig
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('id, title, consumer_id')
      .eq('id', gigId)
      .single();

    if (gigError || !gig) {
      return new Response(
        JSON.stringify({ error: 'Gig not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gig.consumer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only send questions for your own gigs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Screen the message using AI
    console.log('Screening message content...');
    const screenResponse = await fetch(`${supabaseUrl}/functions/v1/screen-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        message,
        senderType: 'gigger',
        context: `Question about project: ${gig.title}`,
      }),
    });

    if (!screenResponse.ok) {
      console.error('Screening failed:', screenResponse.status);
      // Continue with fallback - allow but log
    }

    const screenResult = await screenResponse.json();
    console.log('Screening result:', screenResult);

    // If message is blocked, log the violation and return error
    if (!screenResult.approved) {
      console.log('Message blocked due to violations:', screenResult.violations);
      
      // Log the violation
      await supabase.from('message_violations').insert({
        user_id: user.id,
        gig_id: gigId,
        bid_id: bidId,
        original_message: message,
        violations: screenResult.violations || [],
        violation_details: {
          details: screenResult.violationDetails || [],
          riskScore: screenResult.riskScore || 0,
        },
        risk_score: screenResult.riskScore || 0,
        sender_type: 'gigger',
      });

      return new Response(
        JSON.stringify({
          blocked: true,
          violations: screenResult.violations || ['contact_email'],
          message: 'Your message was blocked because it appears to contain contact information.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create conversation
    const { data: conversation, error: convError } = await supabase
      .from('pre_award_conversations')
      .select('id')
      .eq('gig_id', gigId)
      .eq('bid_id', bidId)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      throw convError;
    }

    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('pre_award_conversations')
        .insert({
          gig_id: gigId,
          bid_id: bidId,
          consumer_id: user.id,
          digger_id: diggerId,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      conversation = newConv;
    }

    // Insert the message
    const { error: msgError } = await supabase
      .from('pre_award_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'gigger',
        message: message,
      });

    if (msgError) throw msgError;

    // Get digger's email for notification
    const { data: diggerProfile, error: diggerError } = await supabase
      .from('digger_profiles')
      .select('user_id')
      .eq('id', diggerId)
      .single();

    if (diggerError) throw diggerError;

    const { data: diggerUser, error: userError } = await supabase.auth.admin.getUserById(diggerProfile.user_id);

    if (userError) throw userError;

    // Send email notification via proxy
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && diggerUser.user?.email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Digs & Gigs <noreply@digsandgigs.net>',
            to: diggerUser.user.email,
            subject: `Question from Project Owner about "${gig.title}"`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #5B21B6;">You have a new question from Project Owner</h2>
                <p>A Gigger has asked you a question about their project:</p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <strong>Project:</strong> ${gig.title}<br><br>
                  <strong>Question:</strong><br>
                  <p style="white-space: pre-wrap;">${message}</p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  <em>Note: The Gigger's identity is protected until you are awarded the job.</em>
                </p>
                <p>
                  <a href="https://digsandgigs.net/role-dashboard" 
                     style="background: #5B21B6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View & Reply
                  </a>
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send email notification:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log('Anonymous question sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        message: 'Your question has been sent anonymously.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in send-anonymous-question:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
