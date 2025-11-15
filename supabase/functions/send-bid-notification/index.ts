import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BidNotificationRequest {
  type: 'submitted' | 'accepted';
  bidId: string;
  gigId: string;
  diggerId: string;
  amount: number;
  timeline: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Extract and verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { type, bidId, gigId, diggerId, amount, timeline }: BidNotificationRequest = await req.json();

    console.log('Processing bid notification:', { type, bidId, gigId, diggerId, userId: user.id });

    // Fetch gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('title, consumer_id, profiles(email)')
      .eq('id', gigId)
      .single();

    if (gigError || !gig) {
      console.error('Failed to fetch gig:', gigError);
      throw new Error('Failed to fetch gig details');
    }

    // Fetch digger details
    const { data: digger, error: diggerError } = await supabase
      .from('digger_profiles')
      .select('handle, user_id, profiles(email)')
      .eq('id', diggerId)
      .single();

    if (diggerError || !digger) {
      console.error('Failed to fetch digger:', diggerError);
      throw new Error('Failed to fetch digger details');
    }

    // SECURITY: Authorization checks
    if (type === 'submitted') {
      // For submitted notifications: verify caller is the digger who owns the bid
      if (digger.user_id !== user.id) {
        console.error('Unauthorized: User is not the bid owner', { userId: user.id, diggerUserId: digger.user_id });
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You can only send notifications for your own bids' }),
          { status: 403, headers: corsHeaders }
        );
      }
    } else if (type === 'accepted') {
      // For accepted notifications: verify caller is the gig owner
      if (gig.consumer_id !== user.id) {
        console.error('Unauthorized: User is not the gig owner', { userId: user.id, gigOwnerId: gig.consumer_id });
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You can only accept bids on your own gigs' }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    console.log('Authorization verified for bid notification');

    let emailResponse;

    if (type === 'submitted') {
      // Notify gig owner about new bid
      const gigOwnerEmail = (gig.profiles as any)?.email;
      
      if (gigOwnerEmail) {
        emailResponse = await resend.emails.send({
          from: "digsandgigs <onboarding@resend.dev>",
          to: [gigOwnerEmail],
          subject: `New Bid on Your Gig: ${gig.title}`,
          html: `
            <h1>New Bid Received!</h1>
            <p>Great news! You've received a new bid on your gig <strong>${gig.title}</strong>.</p>
            
            <h2>Bid Details:</h2>
            <ul>
              <li><strong>Digger:</strong> @${digger.handle}</li>
              <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
              <li><strong>Timeline:</strong> ${timeline}</li>
            </ul>
            
            <p>Log in to view the full proposal and accept the bid if you're interested!</p>
            
            <p>Best regards,<br>The digsandgigs Team</p>
          `,
        });
      }
    } else if (type === 'accepted') {
      // Notify digger about accepted bid
      const diggerEmail = (digger.profiles as any)?.email;
      
      if (diggerEmail) {
        emailResponse = await resend.emails.send({
          from: "digsandgigs <onboarding@resend.dev>",
          to: [diggerEmail],
          subject: `Your Bid Was Accepted: ${gig.title}`,
          html: `
            <h1>Congratulations! Your Bid Was Accepted!</h1>
            <p>Excellent news! Your bid for <strong>${gig.title}</strong> has been accepted.</p>
            
            <h2>Project Details:</h2>
            <ul>
              <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
              <li><strong>Timeline:</strong> ${timeline}</li>
            </ul>
            
            <p>The client is excited to work with you. Log in to view the full project details and get started!</p>
            
            <p>Best regards,<br>The digsandgigs Team</p>
          `,
        });
      }
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-bid-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
