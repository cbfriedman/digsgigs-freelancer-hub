import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "https://esm.sh/resend@3.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { profession, industry, specialties, isNewIndustry, requestId } = await req.json();

    if (!profession) {
      return new Response(
        JSON.stringify({ error: 'Profession is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notifying admins about keyword request:', { profession, industry, specialties, isNewIndustry });

    // Get all admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admins:', adminError);
      throw adminError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .in('id', adminRoles.map(r => r.user_id));

    if (profileError) {
      console.error('Error fetching admin profiles:', profileError);
      throw profileError;
    }

    const adminEmails = adminProfiles?.map(p => p.email) || [];

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ message: 'No admin emails to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter admins based on notification preferences
    const { data: prefsData } = await supabase
      .from('email_preferences')
      .select('user_id, keyword_requests_enabled')
      .in('user_id', adminRoles.map(r => r.user_id))
      .eq('keyword_requests_enabled', true);

    const enabledUserIds = new Set(prefsData?.map(p => p.user_id) || []);
    
    // Get emails only for admins who have this notification enabled
    const filteredAdminProfiles = adminProfiles?.filter(profile => {
      const adminRole = adminRoles.find(r => r.user_id === adminProfiles.find(p => p.email === profile.email)?.email);
      const userId = adminRoles.find(r => {
        const matchingProfile = adminProfiles.find(p => p.email === profile.email);
        return matchingProfile;
      })?.user_id;
      return userId && (enabledUserIds.size === 0 || enabledUserIds.has(userId));
    });

    const notifyEmails = filteredAdminProfiles?.map(p => p.email) || [];

    if (notifyEmails.length === 0) {
      console.log('No admins with keyword notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No admins to notify (all have disabled this notification)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email to admins
    const emailResponse = await resend.emails.send({
      from: 'Digsandgigs <noreply@digsandgigs.net>',
      to: notifyEmails,
      subject: `New Keyword Request: ${profession}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
            New Keyword Suggestion Request
          </h1>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #4CAF50; margin-top: 0;">Request Details:</h2>
            <p><strong>Industry:</strong> ${industry || 'N/A'} ${isNewIndustry ? '(New)' : ''}</p>
            <p><strong>Profession:</strong> ${profession}</p>
            <p><strong>Specialties:</strong> ${Array.isArray(specialties) ? specialties.join(', ') : 'N/A'}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Action Required:</strong> A user has requested keyword suggestions for this profession. 
              Please add relevant keywords to the suggestion system.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            To manage this request:
          </p>
          <ol style="color: #666; line-height: 1.8;">
            <li>Go to the Admin Dashboard</li>
            <li>Navigate to the "Keyword Requests" tab</li>
            <li>Add keywords to <code>src/utils/keywordSuggestions.ts</code></li>
            <li>Mark the request as completed</li>
          </ol>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated notification from Digsandgigs Admin System
            </p>
          </div>
        </div>
      `,
    });

    console.log('Admin notification email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        message: 'Admins notified successfully',
        emailsSent: notifyEmails.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-keyword-request function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});