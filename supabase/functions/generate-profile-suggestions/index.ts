import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, profession, keywords, skills, type } = await req.json();
    const skillsOrKeywords = (skills?.length ? skills : keywords) || [];
    
    if (!companyName || !type) {
      return new Response(
        JSON.stringify({ error: 'Company name and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    let prompt = '';
    if (type === 'title') {
      prompt = `Generate 3 professional and catchy profile titles for a ${profession || 'professional'} business. 
      ${skillsOrKeywords.length ? `They specialize in: ${skillsOrKeywords.join(', ')}` : ''}
      IMPORTANT: Do NOT include the business name "${companyName}" in the suggestions. Just create standalone catchy titles.
      Keep titles under 60 characters, memorable, and professional. Return only the 3 titles, one per line.`;
    } else if (type === 'tagline') {
      prompt = `Generate 3 compelling taglines for a ${profession || 'professional'} business. 
      ${skillsOrKeywords.length ? `They specialize in: ${skillsOrKeywords.join(', ')}` : ''}
      IMPORTANT: Do NOT include the business name "${companyName}" in the suggestions. Just create standalone taglines.
      Keep taglines under 100 characters, impactful, and customer-focused. Return only the 3 taglines, one per line.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional marketing copywriter specializing in creating compelling business titles and taglines. Be concise and impactful.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices[0].message.content
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^\d+[.)]\s*/, '').trim());

    return new Response(
      JSON.stringify({ suggestions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-profile-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
