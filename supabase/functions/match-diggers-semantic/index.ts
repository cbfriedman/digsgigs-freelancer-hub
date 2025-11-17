import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiggerMatch {
  digger_id: string;
  user_id: string;
  business_name: string;
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gig_title, gig_description, gig_category } = await req.json();
    
    console.log("[SEMANTIC-MATCH] Starting semantic matching:", { gig_title, gig_description, gig_category });

    if (!gig_title || !gig_description) {
      console.error("[SEMANTIC-MATCH] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Gig title and description are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all digger profiles with relevant matching fields
    const { data: diggers, error: diggersError } = await supabase
      .from('digger_profiles')
      .select('id, user_id, business_name, profession, custom_occupation_title, skills, bio')
      .not('profession', 'is', null);

    if (diggersError) {
      console.error("[SEMANTIC-MATCH] Error fetching diggers:", diggersError);
      throw new Error("Failed to fetch digger profiles");
    }
    
    console.log(`[SEMANTIC-MATCH] Analyzing ${diggers.length} digger profiles`);

    // Build digger profiles summary for AI
    const diggerProfiles = diggers.map((d, idx) => ({
      index: idx,
      id: d.id,
      user_id: d.user_id,
      business_name: d.business_name,
      profile: [
        d.profession,
        d.custom_occupation_title,
        d.skills?.join(', '),
        d.bio
      ].filter(Boolean).join(' | ')
    }));

    const diggersContext = diggerProfiles
      .map(d => `[${d.index}] ${d.business_name}: ${d.profile}`)
      .join('\n');

    const systemPrompt = `You are an expert at matching service requests with service providers based on semantic similarity.

Analyze the gig description and compare it with each digger's profile to determine which diggers are the best match.

Consider:
- Direct skill/profession matches (e.g., "plumber" gig → plumber digger)
- Related specialties (e.g., "bathroom renovation" → plumbers, tilers, electricians)
- Relevant experience indicated in their profile
- Custom occupation titles that show specialization

Return ONLY the diggers who are genuinely relevant matches. If a digger is not a good match, don't include them.
For each match, provide a confidence score (0-100) and brief reasoning.`;

    const userPrompt = `GIG TO MATCH:
Title: ${gig_title}
Description: ${gig_description}
${gig_category ? `Category: ${gig_category}` : ''}

DIGGER PROFILES:
${diggersContext}

Analyze which diggers are the best matches for this gig.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return the list of matching diggers with confidence scores",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        digger_index: {
                          type: "number",
                          description: "The index number of the matching digger from the list"
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence score 0-100 for how well this digger matches"
                        },
                        reasoning: {
                          type: "string",
                          description: "Brief explanation of why this digger is a good match"
                        }
                      },
                      required: ["digger_index", "confidence", "reasoning"]
                    },
                    description: "Array of matching diggers"
                  }
                },
                required: ["matches"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Map indices back to actual digger data
    const matches: DiggerMatch[] = result.matches
      .map((match: any) => {
        const digger = diggerProfiles[match.digger_index];
        if (!digger) return null;
        
        return {
          digger_id: digger.id,
          user_id: digger.user_id,
          business_name: digger.business_name,
          confidence: match.confidence,
          reasoning: match.reasoning
        };
      })
      .filter((m: any) => m !== null)
      .sort((a: DiggerMatch, b: DiggerMatch) => b.confidence - a.confidence);
    
    console.log(`[SEMANTIC-MATCH] Found ${matches.length} matching diggers`);
    console.log("[SEMANTIC-MATCH] Top matches:", matches.slice(0, 5));

    return new Response(
      JSON.stringify({ matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[SEMANTIC-MATCH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
