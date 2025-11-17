import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "https://esm.sh/resend@3.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
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

    const { frequency } = await req.json();
    console.log('Processing digest for frequency:', frequency);

    // Determine the time window based on frequency
    const now = new Date();
    let cutoffTime: Date;
    
    if (frequency === 'daily') {
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    } else {
      cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    }

    // Get users who have digest enabled for this frequency
    const { data: users, error: usersError } = await supabase
      .from('email_preferences')
      .select('user_id')
      .eq('digest_enabled', true)
      .eq('digest_frequency', frequency);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('No users with digest enabled for this frequency');
      return new Response(
        JSON.stringify({ message: 'No users to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;

    // Process each user
    for (const user of users) {
      // Get unsent notifications from queue
      const { data: queueItems, error: queueError } = await supabase
        .from('notification_digest_queue')
        .select('notification_id, notifications(*)')
        .eq('user_id', user.user_id)
        .is('sent_at', null)
        .gte('created_at', cutoffTime.toISOString());

      if (queueError) {
        console.error('Error fetching queue items:', queueError);
        continue;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('No notifications for user:', user.user_id);
        continue;
      }

      // Get user email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.user_id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        continue;
      }

      // Extract notifications
      const notifications: Notification[] = queueItems
        .map(item => item.notifications as any)
        .filter((n): n is Notification => n !== null && n !== undefined);

      // Generate email HTML
      const emailHtml = generateDigestEmail(notifications, profile.full_name, frequency);

      // Send email
      try {
        await resend.emails.send({
          from: 'Digsandgigs <onboarding@resend.dev>',
          to: profile.email,
          subject: `Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Digest`,
          html: emailHtml,
        });

        // Mark notifications as sent
        const notificationIds = queueItems.map(item => item.notification_id);
        await supabase
          .from('notification_digest_queue')
          .update({ sent_at: now.toISOString() })
          .in('notification_id', notificationIds);

        emailsSent++;
        console.log('Digest email sent to:', profile.email);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Digest processing complete',
        emailsSent 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-notification-digest function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateDigestEmail(notifications: Notification[], userName: string | null, frequency: string): string {
  const notificationsByType = notifications.reduce((acc, notif) => {
    if (!acc[notif.type]) {
      acc[notif.type] = [];
    }
    acc[notif.type].push(notif);
    return acc;
  }, {} as Record<string, Notification[]>);

  const typeLabels: Record<string, string> = {
    'new_bid': 'New Bids',
    'bid_status': 'Bid Updates',
    'new_message': 'New Messages',
    'keyword_request': 'Keyword Requests',
    'system': 'System Alerts',
  };

  const notificationSections = Object.entries(notificationsByType)
    .map(([type, notifs]) => {
      const typeLabel = typeLabels[type] || 'Notifications';
      const items = notifs.map(n => `
        <div style="padding: 15px; background-color: #f9f9f9; border-radius: 6px; margin-bottom: 10px;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${n.title}</h3>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${n.message}</p>
          ${n.link ? `<a href="${n.link}" style="color: #4CAF50; text-decoration: none; font-size: 14px;">View Details →</a>` : ''}
          <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">${new Date(n.created_at).toLocaleDateString()}</p>
        </div>
      `).join('');

      return `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #4CAF50; padding-bottom: 8px;">
            ${typeLabel} (${notifs.length})
          </h2>
          ${items}
        </div>
      `;
    }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} Notification Summary
      </h1>
      
      <p style="color: #666; font-size: 14px; margin: 20px 0;">
        Hi ${userName || 'there'},
      </p>
      
      <p style="color: #666; font-size: 14px; margin-bottom: 30px;">
        Here's a summary of your notifications from the past ${frequency === 'daily' ? '24 hours' : 'week'}:
      </p>
      
      ${notificationSections}
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          You're receiving this digest because you have email notifications enabled.
          <br/>
          To change your notification preferences, visit your account settings.
        </p>
      </div>
    </div>
  `;
}
