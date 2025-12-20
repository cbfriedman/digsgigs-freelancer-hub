import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is designed to be called by a cron job (e.g., from Supabase Edge Functions scheduler)
// It will trigger the auto-generate-blog function

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Scheduled blog generation triggered at:', new Date().toISOString());
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Call the auto-generate-blog function
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-generate-blog`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scheduled: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error calling auto-generate-blog:', errorText);
      throw new Error(`Failed to generate blog: ${response.status}`);
    }

    const result = await response.json();
    console.log('Blog generation result:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Scheduled blog generation completed',
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled-blog-generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
