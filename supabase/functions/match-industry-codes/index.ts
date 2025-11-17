import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, category } = await req.json();

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Title and description are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch industry codes
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all industry codes for context
    const { data: industryCodes, error: codesError } = await supabase
      .from('industry_codes')
      .select('code, code_type, title, description')
      .limit(1000);

    if (codesError) {
      console.error("Error fetching industry codes:", codesError);
      throw new Error("Failed to fetch industry codes");
    }

    // Build a concise reference of codes
    const codeReference = industryCodes
      .map(ic => `${ic.code_type}:${ic.code} - ${ic.title}`)
      .join('\n');

    const systemPrompt = `You are an expert at matching job descriptions to industry classification codes (SIC and NAICS).

Given a gig title, description, and optional category, analyze the content and return the most relevant industry codes.

Available codes:
${codeReference}

Return 3-5 of the most relevant codes. Focus on precision - only return codes that truly match the work being described.`;

    const userPrompt = `Title: ${title}
Description: ${description}
${category ? `Category: ${category}` : ''}

Analyze this gig and return the most relevant SIC and NAICS codes.`;

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
              name: "match_codes",
              description: "Return the most relevant industry codes for the gig",
              parameters: {
                type: "object",
                properties: {
                  sic_codes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of relevant SIC codes (just the code numbers)"
                  },
                  naics_codes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of relevant NAICS codes (just the code numbers)"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why these codes were selected"
                  }
                },
                required: ["sic_codes", "naics_codes", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "match_codes" } }
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
    
    // Extract the tool call result
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    console.log("AI matched codes:", result);

    return new Response(
      JSON.stringify({
        sic_codes: result.sic_codes || [],
        naics_codes: result.naics_codes || [],
        reasoning: result.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in match-industry-codes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
