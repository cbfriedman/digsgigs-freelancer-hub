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
  type: 'submitted' | 'accepted' | 'awarded';
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
    } else if (type === 'accepted' || type === 'awarded') {
      // For accepted/awarded notifications: verify caller is the gig owner
      if (gig.consumer_id !== user.id) {
        console.error('Unauthorized: User is not the gig owner', { userId: user.id, gigOwnerId: gig.consumer_id });
        return new Response(
          JSON.stringify({ error: 'Unauthorized: You can only accept or award bids on your own gigs' }),
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
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [gigOwnerEmail],
          subject: `Great news! A pro wants to help with "${gig.title}" 🎉`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">A Professional Wants Your Job!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">You've got a new quote to review</p>
              </div>
              <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                <p>Hi there! 👋</p>
                
                <p>Exciting news — a qualified professional is interested in helping with your project <strong>"${gig.title}"</strong>!</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">Quote Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Professional:</td>
                      <td style="padding: 8px 0; font-weight: bold;">@${digger.handle}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Quoted Price:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #4caf50;">$${amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Timeline:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${timeline}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://digsandgigs.net/my-gigs" style="display: inline-block; background: #667eea; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Review This Quote</a>
                </div>
                
                <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <strong>💡 Quick tip:</strong> Pros appreciate quick responses! If you're interested, reach out within 24 hours to get the best availability and pricing.
                </div>
                
                <p style="color: #666; font-size: 14px;">Not the right fit? No problem — you're never obligated to accept any quote. Take your time comparing options.</p>
                
                <hr style="border: 1px solid #eee; margin: 25px 0;" />
                <p style="color: #666; font-size: 12px; text-align: center;">
                  Questions? <a href="https://digsandgigs.net/faq" style="color: #667eea;">Visit our FAQ</a> | 
                  <a href="https://digsandgigs.net/email-preferences" style="color: #667eea;">Email preferences</a>
                </p>
                <p style="color: #666; font-size: 12px; text-align: center;">© 2025 Digs and Gigs. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    } else if (type === 'awarded') {
      // Notify digger they've been awarded — they need to accept or decline
      const diggerEmail = (digger.profiles as any)?.email;
      const gigLink = `https://digsandgigs.net/gig/${gigId}`;
      if (diggerEmail) {
        emailResponse = await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [diggerEmail],
          subject: `You've been awarded: "${gig.title}" – Accept or decline`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">You've been awarded this gig</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">The client chose your proposal — accept or decline</p>
              </div>
              <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                <p>Hey @${digger.handle}! 👋</p>
                <p>The client has awarded <strong>"${gig.title}"</strong> to you. Your quoted amount: <strong>$${amount.toFixed(2)}</strong>, timeline: ${timeline}.</p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${gigLink}" style="display: inline-block; background: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">Accept</a>
                  <a href="${gigLink}" style="display: inline-block; background: #666; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px;">View &amp; decline</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you accept, the contract is on and you or the client can set up the payment contract (milestones). If you decline, the award is released so they can choose someone else.</p>
                <hr style="border: 1px solid #eee; margin: 25px 0;" />
                <p style="color: #666; font-size: 12px; text-align: center;">© 2025 Digs and Gigs. All rights reserved.</p>
              </div>
            </div>
          `,
        });
      }
    } else if (type === 'accepted') {
      // Notify digger about accepted bid (after they clicked Accept on the award)
      const diggerEmail = (digger.profiles as any)?.email;
      
      if (diggerEmail) {
        emailResponse = await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [diggerEmail],
          subject: `You got the job! "${gig.title}" is yours 🎉`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your quote was accepted!</p>
              </div>
              <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                <p>Hey @${digger.handle}! 👋</p>
                
                <p>Great news — your quote for <strong>"${gig.title}"</strong> has been accepted! The customer chose YOU.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">Job Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Your Quote:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #4caf50;">$${amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Timeline:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${timeline}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://digsandgigs.net/my-bids" style="display: inline-block; background: #667eea; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Job Details</a>
                </div>
                
                <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <strong>📋 Next steps:</strong>
                  <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Reach out to the customer to confirm scheduling</li>
                    <li>Review any project details or questions</li>
                    <li>Do great work and earn a 5-star review!</li>
                  </ol>
                </div>
                
                <hr style="border: 1px solid #eee; margin: 25px 0;" />
                <p style="color: #666; font-size: 12px; text-align: center;">
                  Questions? <a href="https://digsandgigs.net/faq" style="color: #667eea;">Visit our FAQ</a> | 
                  <a href="https://digsandgigs.net/email-preferences" style="color: #667eea;">Email preferences</a>
                </p>
                <p style="color: #666; font-size: 12px; text-align: center;">© 2025 Digs and Gigs. All rights reserved.</p>
              </div>
            </div>
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
