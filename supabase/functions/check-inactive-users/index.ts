import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface EmailResult {
  email: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const emailsSent: EmailResult[] = [];

    console.log('Starting comprehensive inactive user check...');

    // Time windows
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ============================================
    // 1. CHECK FOR ABANDONED PROJECTS (48 hours)
    // Projects that were started but not confirmed
    // ============================================
    console.log('Checking for abandoned projects...');
    
    const { data: abandonedGigs, error: abandonedError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        consumer_id,
        created_at,
        profiles!gigs_consumer_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('confirmation_status', 'pending')
      .lt('created_at', twoDaysAgo.toISOString())
      .gte('created_at', threeDaysAgo.toISOString()); // Only within last 3 days to avoid re-sending

    if (abandonedError) {
      console.error('Error fetching abandoned gigs:', abandonedError);
    } else {
      console.log(`Found ${abandonedGigs?.length || 0} abandoned projects`);
      
      for (const gig of abandonedGigs || []) {
        const profile = gig.profiles as any;
        if (!profile?.email) continue;

        // Check if we already sent an email for this gig
        const { data: existingLog } = await supabase
          .from('marketing_email_log')
          .select('id')
          .eq('user_id', profile.id)
          .eq('reason', 'abandoned_project')
          .gte('sent_at', threeDaysAgo.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Skipping ${profile.email} - already sent abandoned project email`);
          continue;
        }

        // Check email preferences
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('enabled')
          .eq('user_id', profile.id)
          .single();

        if (prefs && !prefs.enabled) {
          console.log(`Skipping ${profile.email} - emails disabled`);
          continue;
        }

        // Send abandoned project email
        try {
          const response = await supabase.functions.invoke('send-reengagement-email', {
            body: {
              userId: profile.id,
              email: profile.email,
              name: profile.full_name,
              reason: 'abandoned_project'
            }
          });

          if (response.error) {
            console.error(`Failed to send abandoned project email to ${profile.email}:`, response.error);
          } else {
            emailsSent.push({ email: profile.email, reason: 'abandoned_project' });
            console.log(`Abandoned project email sent to ${profile.email}`);
          }
        } catch (emailError) {
          console.error(`Error sending abandoned project email to ${profile.email}:`, emailError);
        }
      }
    }

    // ============================================
    // 2. CHECK FOR NO BIDS (3+ days, no bids received)
    // ============================================
    console.log('Checking for gigs with no bids...');
    
    const { data: noBidsGigs, error: noBidsError } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        consumer_id,
        created_at,
        profiles!gigs_consumer_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('status', 'open')
      .eq('is_confirmed_lead', true)
      .lt('created_at', threeDaysAgo.toISOString())
      .gte('created_at', sevenDaysAgo.toISOString()); // Within last week

    if (noBidsError) {
      console.error('Error fetching no-bids gigs:', noBidsError);
    } else {
      console.log(`Found ${noBidsGigs?.length || 0} potential no-bids gigs`);
      
      for (const gig of noBidsGigs || []) {
        const profile = gig.profiles as any;
        if (!profile?.email) continue;

        // Check if this gig has any bids
        const { data: bids, count: bidCount } = await supabase
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('gig_id', gig.id);

        if (bidCount && bidCount > 0) {
          console.log(`Skipping gig ${gig.id} - has ${bidCount} bids`);
          continue;
        }

        // Check if we already sent a no-bids email for this user recently
        const { data: existingLog } = await supabase
          .from('marketing_email_log')
          .select('id')
          .eq('user_id', profile.id)
          .eq('reason', 'no_bids')
          .gte('sent_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Skipping ${profile.email} - already sent no-bids email`);
          continue;
        }

        // Check email preferences
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('enabled')
          .eq('user_id', profile.id)
          .single();

        if (prefs && !prefs.enabled) {
          console.log(`Skipping ${profile.email} - emails disabled`);
          continue;
        }

        // Send no bids email
        try {
          const response = await supabase.functions.invoke('send-reengagement-email', {
            body: {
              userId: profile.id,
              email: profile.email,
              name: profile.full_name,
              reason: 'no_bids'
            }
          });

          if (response.error) {
            console.error(`Failed to send no-bids email to ${profile.email}:`, response.error);
          } else {
            emailsSent.push({ email: profile.email, reason: 'no_bids' });
            console.log(`No-bids email sent to ${profile.email}`);
          }
        } catch (emailError) {
          console.error(`Error sending no-bids email to ${profile.email}:`, emailError);
        }
      }
    }

    // ============================================
    // 3. CHECK FOR GENERALLY INACTIVE USERS (7+ days)
    // ============================================
    console.log('Checking for inactive users (7+ days)...');

    const { data: inactiveUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        updated_at
      `)
      .eq('user_type', 'consumer')
      .lt('updated_at', sevenDaysAgo.toISOString())
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching inactive users:', usersError);
    } else {
      console.log(`Found ${inactiveUsers?.length || 0} potentially inactive users`);

      for (const user of inactiveUsers || []) {
        // Check if user has email preferences enabled
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('enabled')
          .eq('user_id', user.id)
          .single();

        if (prefs && !prefs.enabled) {
          console.log(`Skipping ${user.email} - emails disabled`);
          continue;
        }

        // Check if we already sent an inactive email recently
        const { data: existingLog } = await supabase
          .from('marketing_email_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('reason', 'inactive')
          .gte('sent_at', thirtyDaysAgo.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Skipping ${user.email} - already sent inactive email recently`);
          continue;
        }

        // Check if user has posted any gigs recently
        const { data: recentGigs } = await supabase
          .from('gigs')
          .select('id')
          .eq('consumer_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (recentGigs && recentGigs.length > 0) {
          console.log(`Skipping ${user.email} - has recent activity`);
          continue;
        }

        // Send re-engagement email
        try {
          const response = await supabase.functions.invoke('send-reengagement-email', {
            body: {
              userId: user.id,
              email: user.email,
              name: user.full_name,
              reason: 'inactive'
            }
          });

          if (response.error) {
            console.error(`Failed to send inactive email to ${user.email}:`, response.error);
          } else {
            emailsSent.push({ email: user.email, reason: 'inactive' });
            console.log(`Inactive re-engagement email sent to ${user.email}`);
          }
        } catch (emailError) {
          console.error(`Error sending email to ${user.email}:`, emailError);
        }
      }
    }

    // Summary
    const summary = {
      abandoned_project: emailsSent.filter(e => e.reason === 'abandoned_project').length,
      no_bids: emailsSent.filter(e => e.reason === 'no_bids').length,
      inactive: emailsSent.filter(e => e.reason === 'inactive').length,
    };

    console.log(`Completed: sent ${emailsSent.length} total emails`, summary);

    return new Response(JSON.stringify({ 
      success: true, 
      totalEmailsSent: emailsSent.length,
      summary,
      recipients: emailsSent 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in check-inactive-users:", error);
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
