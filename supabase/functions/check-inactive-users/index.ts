import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for inactive users (7+ days)...');

    // Find users who:
    // 1. Haven't posted a gig in 7+ days
    // 2. Haven't received a re-engagement email recently (30 days)
    // 3. Have email preferences enabled
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get users who are giggers (consumers) and inactive
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
      throw usersError;
    }

    console.log(`Found ${inactiveUsers?.length || 0} potentially inactive users`);

    const emailsSent: string[] = [];

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
          console.error(`Failed to send to ${user.email}:`, response.error);
        } else {
          emailsSent.push(user.email);
          console.log(`Re-engagement email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
      }
    }

    console.log(`Completed: sent ${emailsSent.length} re-engagement emails`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent: emailsSent.length,
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
