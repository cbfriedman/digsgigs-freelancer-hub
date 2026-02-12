import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-PROFILE-CALL] ${step}${detailsStr}`);
};

/**
 * Google CPC data by industry category (same as calculate-profile-click-price)
 */
const INDUSTRY_CPC_DATA: Record<string, { avgCpc: number; highCpc: number }> = {
  'personal injury law': { avgCpc: 450, highCpc: 935 },
  'criminal defense law': { avgCpc: 280, highCpc: 385 },
  'family law': { avgCpc: 195, highCpc: 285 },
  'auto insurance': { avgCpc: 165, highCpc: 285 },
  'health insurance': { avgCpc: 245, highCpc: 385 },
  'life insurance': { avgCpc: 185, highCpc: 295 },
  'mortgage': { avgCpc: 175, highCpc: 295 },
  'credit repair': { avgCpc: 145, highCpc: 285 },
  'business loans': { avgCpc: 195, highCpc: 325 },
  'real estate': { avgCpc: 85, highCpc: 175 },
  'plumbing': { avgCpc: 55, highCpc: 95 },
  'hvac': { avgCpc: 65, highCpc: 115 },
  'electrician': { avgCpc: 55, highCpc: 95 },
  'roofing': { avgCpc: 85, highCpc: 145 },
  'landscaping': { avgCpc: 35, highCpc: 65 },
  'web development': { avgCpc: 45, highCpc: 85 },
  'photography': { avgCpc: 25, highCpc: 55 },
  'cleaning': { avgCpc: 15, highCpc: 35 },
  'pet care': { avgCpc: 12, highCpc: 28 },
  'tutoring': { avgCpc: 18, highCpc: 38 },
  'moving': { avgCpc: 22, highCpc: 45 },
};

const DEFAULT_CPC = {
  'high-value': { avgCpc: 150, highCpc: 350 },
  'mid-value': { avgCpc: 45, highCpc: 85 },
  'low-value': { avgCpc: 15, highCpc: 35 },
};

// Call action costs 2x the click value (2x of 75% of Google avg PPC = 150% of avg PPC)
const PROFILE_CALL_MULTIPLIER = 1.50;

function findCpcData(keyword: string): { avgCpc: number; highCpc: number; matchedKey: string | null } {
  const normalized = keyword.toLowerCase().trim();
  
  if (INDUSTRY_CPC_DATA[normalized]) {
    return { ...INDUSTRY_CPC_DATA[normalized], matchedKey: normalized };
  }
  
  for (const [key, data] of Object.entries(INDUSTRY_CPC_DATA)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return { ...data, matchedKey: key };
    }
  }
  
  let category: 'high-value' | 'mid-value' | 'low-value' = 'mid-value';
  const highValueKeywords = ['law', 'insurance', 'mortgage', 'credit', 'loan', 'legal', 'attorney'];
  const lowValueKeywords = ['clean', 'pet', 'tutor', 'move', 'handyman', 'lawn'];
  
  if (highValueKeywords.some(kw => normalized.includes(kw))) {
    category = 'high-value';
  } else if (lowValueKeywords.some(kw => normalized.includes(kw))) {
    category = 'low-value';
  }
  
  return { ...DEFAULT_CPC[category], matchedKey: null };
}

function roundToHalfDollar(amount: number): number {
  return Math.ceil(amount * 2) / 2;
}

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

    const { digger_profile_id, call_duration_seconds } = await req.json();
    
    if (!digger_profile_id) {
      throw new Error('digger_profile_id is required');
    }

    logStep("Request received", { digger_profile_id, call_duration_seconds });

    // Get gigger profile (the person clicking call)
    const { data: giggerProfile, error: giggerError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', user.id)
      .single();

    if (giggerError) {
      throw new Error(`Failed to fetch gigger profile: ${giggerError.message}`);
    }

    logStep("Gigger profile fetched", { email: giggerProfile.email });

    // Get digger profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('id, profession, keywords, skills, industry_type, user_id, phone')
      .eq('id', digger_profile_id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // Prevent diggers from calling themselves
    if (profile.user_id === user.id) {
      throw new Error('Cannot record call to your own profile');
    }

    // Get digger's email from profiles table
    const { data: diggerUserProfile, error: diggerUserError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', profile.user_id)
      .single();

    if (diggerUserError) {
      throw new Error(`Failed to fetch digger user profile: ${diggerUserError.message}`);
    }

    logStep("Profile fetched", { profession: profile.profession });

    // Calculate call price (2x click value = 2x of 75% of Google avg PPC = 150% of avg PPC)
    const keyword = profile.profession || profile.industry_type || 'general contractor';
    const cpcData = findCpcData(keyword);
    const costDollars = roundToHalfDollar(cpcData.avgCpc * PROFILE_CALL_MULTIPLIER);
    const costCents = Math.round(costDollars * 100);

    logStep("Price calculated", { costCents, avgCpc: cpcData.avgCpc });

    // Record the call
    const { data: callRecord, error: insertError } = await supabaseClient
      .from('profile_calls')
      .insert({
        digger_profile_id,
        consumer_id: user.id,
        call_duration_seconds: call_duration_seconds || null,
        cost_cents: costCents,
        keyword_matched: cpcData.matchedKey,
        google_high_cpc_cents: Math.round(cpcData.avgCpc * 100),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to record call: ${insertError.message}`);
    }

    logStep("Call recorded", { callId: callRecord.id });

    // Create in-app notification for digger
    await supabaseClient.rpc('create_notification', {
      p_user_id: profile.user_id,
      p_title: 'A new lead from Digs&Gigs',
      p_message: `${giggerProfile.full_name || 'A consumer'} called your profile! Contact: ${giggerProfile.email}${giggerProfile.phone ? `, ${giggerProfile.phone}` : ''}. Lead charge: $${costDollars.toFixed(2)}`,
      p_type: 'profile_call',
      p_link: '/profile-dashboard',
    });

    logStep("In-app notification created");

    // Send email notification to digger
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && diggerUserProfile.email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Digs and Gigs <onboarding@resend.dev>',
            to: [diggerUserProfile.email],
            subject: 'A new lead from Digs&Gigs',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">🎉 You have a new lead!</h2>
                <p>Great news! Someone just called your profile on Digs and Gigs.</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Consumer Contact Information:</h3>
                  <p><strong>Name:</strong> ${giggerProfile.full_name || 'Not provided'}</p>
                  <p><strong>Email:</strong> ${giggerProfile.email}</p>
                  ${giggerProfile.phone ? `<p><strong>Phone:</strong> ${giggerProfile.phone}</p>` : ''}
                </div>
                
                <p><strong>Lead charge:</strong> $${costDollars.toFixed(2)}</p>
                
                <p>We recommend reaching out promptly to maximize your chances of winning this lead!</p>
                
                <p style="color: #666; font-size: 14px;">— The Digs and Gigs Team</p>
              </div>
            `,
          }),
        });
        logStep("Email notification sent to digger");
      } catch (emailError) {
        logStep("Failed to send email notification", { error: String(emailError) });
        // Don't fail the whole request if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      callId: callRecord.id,
      costCents,
      costDollars,
      diggerPhone: profile.phone,
      googleAvgCpc: cpcData.avgCpc,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
