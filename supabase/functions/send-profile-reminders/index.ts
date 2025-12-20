import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiggerProfile {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  location: string;
  profession: string;
  bio: string;
  hourly_rate_min: number;
  hourly_rate_max: number;
  years_experience: number;
  availability: string;
  portfolio_urls: string[];
  skills: string[];
  certifications: string[];
  is_insured: boolean;
  is_bonded: boolean;
  sic_code: string;
  naics_code: string;
  custom_occupation_title: string;
}

const calculateProfileCompletion = (profile: DiggerProfile): number => {
  const fields = [
    profile.business_name,
    profile.phone,
    profile.location,
    profile.profession,
    profile.bio,
    profile.hourly_rate_min,
    profile.hourly_rate_max,
    profile.years_experience,
    profile.availability,
    profile.portfolio_urls && profile.portfolio_urls.length > 0,
    profile.skills && profile.skills.length > 0,
    profile.certifications && profile.certifications.length > 0,
    profile.is_insured !== null,
    profile.is_bonded !== null,
    profile.sic_code || profile.naics_code,
  ];
  
  const completedFields = fields.filter(field => {
    if (typeof field === 'boolean') return field;
    return field !== null && field !== undefined && field !== '';
  }).length;
  
  return Math.round((completedFields / fields.length) * 100);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // SECURITY: Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: corsHeaders }
      );
    }

    console.log(`Admin ${user.id} initiated profile completion reminder job`);
    
    // Get all digger profiles with their user data
    const { data: diggers, error: diggersError } = await supabase
      .from("digger_profiles")
      .select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `);

    if (diggersError) {
      console.error("Error fetching diggers:", diggersError);
      throw diggersError;
    }

    console.log(`Found ${diggers?.length || 0} diggers to check`);

    let remindersSent = 0;
    const now = new Date();

    for (const digger of diggers || []) {
      try {
        // Calculate profile completion
        const completion = calculateProfileCompletion(digger);
        
        // Skip if profile is complete
        if (completion === 100) {
          continue;
        }

        // Get user's last sign in time from auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
          digger.user_id
        );

        if (authError || !authData.user) {
          console.error(`Error getting auth data for user ${digger.user_id}:`, authError);
          continue;
        }

        const lastSignIn = authData.user.last_sign_in_at 
          ? new Date(authData.user.last_sign_in_at)
          : new Date(digger.created_at);
        
        const daysSinceLastLogin = Math.floor(
          (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log(`Digger ${digger.id}: ${completion}% complete, ${daysSinceLastLogin} days since login`);

        // Determine which reminder to send
        let reminderType: '3_day' | '7_day' | '14_day' | null = null;
        
        if (daysSinceLastLogin >= 14) {
          reminderType = '14_day';
        } else if (daysSinceLastLogin >= 7) {
          reminderType = '7_day';
        } else if (daysSinceLastLogin >= 3) {
          reminderType = '3_day';
        }

        if (!reminderType) {
          continue;
        }

        // Check if this reminder was already sent
        const { data: existingReminder } = await supabase
          .from("profile_completion_reminders")
          .select("id")
          .eq("digger_id", digger.id)
          .eq("reminder_type", reminderType)
          .single();

        if (existingReminder) {
          console.log(`Reminder ${reminderType} already sent for digger ${digger.id}`);
          continue;
        }

        // Send email
        const email = (digger.profiles as any)?.email;
        const name = (digger.profiles as any)?.full_name || digger.business_name;

        if (!email) {
          console.error(`No email found for digger ${digger.id}`);
          continue;
        }

        const emailSubject = reminderType === '3_day'
          ? "Complete Your Profile - Get More Clients!"
          : reminderType === '7_day'
          ? "Still There? Your Profile Needs Attention"
          : "Last Reminder: Complete Your Profile";

        const urgencyMessage = reminderType === '3_day'
          ? "Your profile is currently at " + completion + "% completion."
          : reminderType === '7_day'
          ? "It's been a week and your profile is still incomplete at " + completion + "%."
          : "This is our final reminder - your profile is at " + completion + "% completion.";

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .stats { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Complete Your Digger Profile</h1>
                </div>
                <div class="content">
                  <p>Hi ${name},</p>
                  
                  <p>${urgencyMessage}</p>
                  
                  <div class="stats">
                    <h3>Why Complete Your Profile?</h3>
                    <ul>
                      <li>✅ Profiles with 100% completion get 3x more client views</li>
                      <li>✅ Complete profiles appear higher in search results</li>
                      <li>✅ Clients trust complete profiles more</li>
                      <li>✅ Increase your chances of winning gigs</li>
                    </ul>
                  </div>
                  
                  <p>It only takes a few minutes to complete your profile and start getting more opportunities!</p>
                  
                  <div style="text-align: center;">
                    <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}/profile-completion" class="button">
                      Complete My Profile Now
                    </a>
                  </div>
                  
                  <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    If you've already completed your profile, you can safely ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p>Digs and Gigs - Where Talent Meets Opportunity</p>
                  <p>You're receiving this because you have an incomplete digger profile.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [email],
          subject: `${emailSubject} | Digs and Gigs`,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error(`Error sending email to ${email}:`, emailResponse.error);
          continue;
        }

        console.log(`Email sent successfully to ${email}`);

        // Record that reminder was sent
        const { error: insertError } = await supabase
          .from("profile_completion_reminders")
          .insert({
            digger_id: digger.id,
            reminder_type: reminderType,
            profile_completion_at_send: completion,
          });

        if (insertError) {
          console.error(`Error recording reminder for digger ${digger.id}:`, insertError);
        } else {
          remindersSent++;
          console.log(`Recorded ${reminderType} reminder for digger ${digger.id}`);
        }

      } catch (diggerError) {
        console.error(`Error processing digger ${digger.id}:`, diggerError);
      }
    }

    const result = {
      success: true,
      message: `Profile completion reminders job completed`,
      remindersSent,
      diggersChecked: diggers?.length || 0,
      timestamp: now.toISOString(),
    };

    console.log("Job completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-profile-reminders function:", error);
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
