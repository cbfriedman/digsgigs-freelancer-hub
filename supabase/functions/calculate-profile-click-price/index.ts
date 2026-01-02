import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-PROFILE-CLICK-PRICE] ${step}${detailsStr}`);
};

/**
 * Google CPC data by industry category
 * Simplified version for edge function use
 */
const INDUSTRY_CPC_DATA: Record<string, { avgCpc: number; highCpc: number }> = {
  // High-value industries
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
  
  // Mid-value industries
  'plumbing': { avgCpc: 55, highCpc: 95 },
  'hvac': { avgCpc: 65, highCpc: 115 },
  'electrician': { avgCpc: 55, highCpc: 95 },
  'roofing': { avgCpc: 85, highCpc: 145 },
  'landscaping': { avgCpc: 35, highCpc: 65 },
  'web development': { avgCpc: 45, highCpc: 85 },
  'photography': { avgCpc: 25, highCpc: 55 },
  
  // Low-value industries
  'cleaning': { avgCpc: 15, highCpc: 35 },
  'pet care': { avgCpc: 12, highCpc: 28 },
  'tutoring': { avgCpc: 18, highCpc: 38 },
  'moving': { avgCpc: 22, highCpc: 45 },
};

// Default CPC by category
const DEFAULT_CPC = {
  'high-value': { avgCpc: 150, highCpc: 350 },
  'mid-value': { avgCpc: 45, highCpc: 85 },
  'low-value': { avgCpc: 15, highCpc: 35 },
};

const PROFILE_CLICK_MULTIPLIER = 0.75; // 75% of Google avg PPC
const PROFILE_CALL_MULTIPLIER = 1.0;   // 100% of Google high PPC

/**
 * Find CPC data for a keyword/profession
 */
function findCpcData(keyword: string): { avgCpc: number; highCpc: number; matchedKey: string | null } {
  const normalized = keyword.toLowerCase().trim();
  
  // Try exact match first
  if (INDUSTRY_CPC_DATA[normalized]) {
    return { ...INDUSTRY_CPC_DATA[normalized], matchedKey: normalized };
  }
  
  // Try partial match
  for (const [key, data] of Object.entries(INDUSTRY_CPC_DATA)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return { ...data, matchedKey: key };
    }
  }
  
  // Determine category and use default
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

/**
 * Round to nearest $0.50
 */
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

    const { digger_profile_id, price_type = 'click' } = await req.json();
    
    if (!digger_profile_id) {
      throw new Error('digger_profile_id is required');
    }

    logStep("Request received", { digger_profile_id, price_type });

    // Get digger profile to find their profession
    const { data: profile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('profession, keywords, industry_type')
      .eq('id', digger_profile_id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    logStep("Profile fetched", { profession: profile.profession, industry: profile.industry_type });

    // Determine the keyword to use for pricing
    const keyword = profile.profession || profile.industry_type || 'general contractor';
    
    // Get CPC data
    const cpcData = findCpcData(keyword);
    logStep("CPC data found", cpcData);

    let baseCpc: number;
    let multiplier: number;

    if (price_type === 'call') {
      // Profile call: 100% of Google high PPC
      baseCpc = cpcData.highCpc;
      multiplier = PROFILE_CALL_MULTIPLIER;
    } else {
      // Profile click: 75% of Google avg PPC
      baseCpc = cpcData.avgCpc;
      multiplier = PROFILE_CLICK_MULTIPLIER;
    }

    const costDollars = roundToHalfDollar(baseCpc * multiplier);
    const costCents = Math.round(costDollars * 100);

    logStep("Price calculated", { 
      price_type, 
      baseCpc, 
      multiplier, 
      costDollars, 
      costCents 
    });

    return new Response(JSON.stringify({
      costCents,
      costDollars,
      baseCpc,
      multiplier: `${multiplier * 100}%`,
      matchedKeyword: cpcData.matchedKey,
      profession: keyword,
      priceType: price_type,
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
