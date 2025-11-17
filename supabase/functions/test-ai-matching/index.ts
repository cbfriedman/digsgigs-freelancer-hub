import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestLog {
  step: string;
  timestamp: string;
  data?: any;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: TestLog[] = [];
  const addLog = (step: string, success: boolean, data?: any, error?: string) => {
    const log: TestLog = {
      step,
      timestamp: new Date().toISOString(),
      success,
      data,
      error
    };
    logs.push(log);
    console.log(`[TEST-AI-MATCHING] ${step}:`, JSON.stringify(log, null, 2));
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    addLog("Initialized Supabase client", true);

    // Step 1: Get test data
    const { gigTitle, gigDescription, gigCategory } = await req.json();
    addLog("Received test data", true, { gigTitle, gigDescription, gigCategory });

    // Step 2: Find diggers with industry codes set
    const { data: diggersWithCodes, error: diggersError } = await supabase
      .from('digger_profiles')
      .select('id, user_id, business_name, sic_code, naics_code, profession')
      .or('sic_code.not.is.null,naics_code.not.is.null')
      .limit(10);

    if (diggersError) {
      addLog("Failed to fetch diggers", false, null, diggersError.message);
      throw diggersError;
    }

    addLog("Fetched diggers with codes", true, { 
      count: diggersWithCodes?.length,
      diggers: diggersWithCodes 
    });

    // Step 3: Call AI matching function
    addLog("Calling AI matching function", true);
    const matchResponse = await fetch(`${supabaseUrl}/functions/v1/match-industry-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        title: gigTitle,
        description: gigDescription,
        category: gigCategory
      })
    });

    if (!matchResponse.ok) {
      const errorText = await matchResponse.text();
      addLog("AI matching failed", false, null, errorText);
      throw new Error(`AI matching failed: ${errorText}`);
    }

    const matchResult = await matchResponse.json();
    addLog("AI matching completed", true, matchResult);

    // Step 4: Check which diggers would be notified
    const sicCodes = matchResult.sic_codes || [];
    const naicsCodes = matchResult.naics_codes || [];
    
    const matchingDiggers = diggersWithCodes?.filter(digger => 
      (digger.sic_code && sicCodes.includes(digger.sic_code)) ||
      (digger.naics_code && naicsCodes.includes(digger.naics_code))
    ) || [];

    addLog("Found matching diggers", true, {
      totalDiggers: diggersWithCodes?.length,
      matchingDiggers: matchingDiggers.length,
      matches: matchingDiggers.map(d => ({
        business_name: d.business_name,
        sic_code: d.sic_code,
        naics_code: d.naics_code,
        matched_sic: sicCodes.includes(d.sic_code || ''),
        matched_naics: naicsCodes.includes(d.naics_code || '')
      }))
    });

    // Step 5: Check recent notifications for these diggers
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('user_id, title, message, created_at')
      .in('user_id', matchingDiggers.map(d => d.user_id))
      .eq('type', 'new_gig')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (notifError) {
      addLog("Failed to fetch notifications", false, null, notifError.message);
    } else {
      addLog("Fetched recent notifications", true, {
        count: recentNotifications?.length,
        notifications: recentNotifications
      });
    }

    // Summary
    const summary = {
      ai_matching: {
        sic_codes: sicCodes,
        naics_codes: naicsCodes,
        reasoning: matchResult.reasoning
      },
      diggers: {
        total_with_codes: diggersWithCodes?.length,
        would_be_notified: matchingDiggers.length,
        matching_details: matchingDiggers
      },
      notifications: {
        recent_count: recentNotifications?.length || 0,
        notifications: recentNotifications || []
      }
    };

    addLog("Test completed successfully", true, summary);

    return new Response(
      JSON.stringify({ 
        success: true,
        logs,
        summary
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog("Test failed", false, null, errorMessage);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        logs
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
