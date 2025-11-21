import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    const { industry, profession, specialties, isNewIndustry } = await req.json();

    // Validate required fields
    if (!industry || typeof industry !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Industry is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profession || typeof profession !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Profession is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!specialties || !Array.isArray(specialties) || specialties.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one specialty is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a composite key for checking duplicates
    const requestKey = `${industry.toLowerCase().trim()}|${profession.toLowerCase().trim()}`;

    // Check if there's already a pending request for this industry/profession combo
    const { data: existingRequest } = await supabase
      .from('keyword_suggestion_requests')
      .select('id')
      .eq('profession', requestKey)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ 
          message: 'A request for this industry/profession combination already exists',
          alreadyExists: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the new request with metadata
    const { data, error } = await supabase
      .from('keyword_suggestion_requests')
      .insert({
        profession: requestKey, // Store composite key for uniqueness
        user_id: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting request:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to submit request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Keyword suggestion request created:', data);

    // Send notification to admins asynchronously with full data
    supabase.functions.invoke('notify-keyword-request', {
      body: { 
        industry,
        profession,
        specialties,
        isNewIndustry,
        requestId: data.id 
      }
    }).then(({ error: notifyError }) => {
      if (notifyError) {
        console.error('Error notifying admins:', notifyError);
      } else {
        console.log('Admin notification sent successfully');
      }
    });

    return new Response(
      JSON.stringify({ 
        message: 'Request submitted successfully',
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-keyword-suggestions function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});