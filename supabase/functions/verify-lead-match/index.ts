import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gigId, diggerProfileId } = await req.json();

    if (!gigId || !diggerProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('title, description, sic_codes, naics_codes, category_id')
      .eq('id', gigId)
      .single();

    if (gigError) throw gigError;

    // Fetch category separately if it exists
    let categoryName = 'Not specified';
    if (gig.category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', gig.category_id)
        .single();
      if (category) categoryName = category.name;
    }

    // Fetch digger profile details
    const { data: digger, error: diggerError } = await supabase
      .from('digger_profiles')
      .select('profession, sic_code, naics_code, custom_occupation_title')
      .eq('id', diggerProfileId)
      .single();

    if (diggerError) throw diggerError;

    // Prepare the AI prompt
    const systemPrompt = `You are an expert at matching job descriptions to professional occupations and industry codes. 
Your task is to determine if a gig posting matches a digger's professional qualifications.

Analyze both the explicit industry codes (SIC/NAICS) and the semantic meaning of the job descriptions.
Consider that jobs may use different terminology but refer to the same type of work.

Return your analysis using the match_verification function.`;

    const userPrompt = `
GIG DETAILS:
- Title: ${gig.title}
- Description: ${gig.description}
- Category: ${categoryName}
- SIC Codes: ${gig.sic_codes?.length ? gig.sic_codes.join(', ') : 'None'}
- NAICS Codes: ${gig.naics_codes?.length ? gig.naics_codes.join(', ') : 'None'}

DIGGER QUALIFICATIONS:
- Profession: ${digger.profession}
- Custom Occupation Title: ${digger.custom_occupation_title || 'None'}
- SIC Codes: ${digger.sic_code?.length ? digger.sic_code.join(', ') : 'None'}
- NAICS Codes: ${digger.naics_code?.length ? digger.naics_code.join(', ') : 'None'}

Does this gig match the digger's professional qualifications? Consider:
1. Do the industry codes overlap?
2. Does the job description semantically match the digger's profession?
3. Would a reasonable person in this profession bid on this type of work?
`;

    console.log('Calling Lovable AI for match verification...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'match_verification',
              description: 'Verify if a gig matches a digger\'s qualifications',
              parameters: {
                type: 'object',
                properties: {
                  matches: {
                    type: 'boolean',
                    description: 'True if the gig matches the digger\'s qualifications, false otherwise'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level in the matching decision'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Detailed explanation of why it does or does not match'
                  },
                  code_overlap: {
                    type: 'boolean',
                    description: 'Whether there is any SIC or NAICS code overlap'
                  },
                  semantic_match: {
                    type: 'boolean',
                    description: 'Whether the job semantically matches the profession'
                  }
                },
                required: ['matches', 'confidence', 'reasoning', 'code_overlap', 'semantic_match'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'match_verification' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI verification failed');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    // Extract the function call result
    const functionCall = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (!functionCall) {
      throw new Error('No function call in AI response');
    }

    const verification = JSON.parse(functionCall.arguments);
    
    console.log('Verification result:', verification);

    return new Response(
      JSON.stringify({
        matches: verification.matches,
        confidence: verification.confidence,
        reasoning: verification.reasoning,
        codeOverlap: verification.code_overlap,
        semanticMatch: verification.semantic_match,
        gigTitle: gig.title,
        diggerProfession: digger.custom_occupation_title || digger.profession
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in verify-lead-match:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
