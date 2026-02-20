import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

interface FacebookLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface FacebookWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: {
      ad_id?: string;
      adgroup_id?: string;
      campaign_id?: string;
      created_time: number;
      form_id: string;
      leadgen_id: string;
      page_id: string;
    };
  }>;
}

interface FacebookWebhookPayload {
  object: string;
  entry: FacebookWebhookEntry[];
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[Facebook Lead Webhook] ${step}`, details ? JSON.stringify(details) : '');
};

const verifySignature = (payload: string, signature: string | null, appSecret: string): boolean => {
  if (!signature) {
    logStep('No signature provided');
    return false;
  }
  const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  const isValid = signature === expectedSignature;
  logStep('Signature verification', { isValid, received: signature.substring(0, 20) + '...' });
  return isValid;
};

const fetchLeadData = async (leadgenId: string, accessToken: string): Promise<FacebookLeadData | null> => {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;
    logStep('Fetching lead data from Graph API', { leadgenId });
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      logStep('Graph API error', { status: response.status, error: errorText });
      return null;
    }
    const data = await response.json();
    logStep('Lead data fetched successfully', { leadId: data.id, fieldCount: data.field_data?.length });
    return data;
  } catch (error) {
    logStep('Error fetching lead data', { error: String(error) });
    return null;
  }
};

const parseLeadFields = (fieldData: FacebookLeadData['field_data']): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const field of fieldData) {
    const name = field.name.toLowerCase().replace(/\s+/g, '_');
    fields[name] = field.values[0] || '';
  }
  return fields;
};

/**
 * Create an auth user + profile + digger_profile from a Facebook lead.
 * Returns the digger_profile id on success, or null on failure.
 */
const createDiggerFromLead = async (
  supabase: ReturnType<typeof createClient>,
  email: string,
  fullName: string | null,
  phone: string | null,
  campaignId: string | null,
  leadMetadata: Record<string, unknown>,
): Promise<string | null> => {
  try {
    // 1. Check if auth user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1 });
    // Use a targeted approach: try to create, handle duplicate
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true, // auto-confirm since they came from a verified form
      user_metadata: {
        full_name: fullName || '',
        source: 'facebook_lead',
      },
    });

    let userId: string;

    if (authError) {
      // If user already exists, look up their ID
      if (authError.message?.includes('already been registered') || authError.message?.includes('duplicate')) {
        logStep('Auth user already exists, looking up', { email });
        const { data: lookupData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!lookupData?.id) {
          logStep('Could not find existing profile for email', { email });
          return null;
        }
        userId = lookupData.id;
      } else {
        logStep('Error creating auth user', { error: authError.message });
        return null;
      }
    } else {
      userId = authData.user.id;
      logStep('Auth user created', { userId });
    }

    // 2. Upsert profile (handle_new_user trigger may have already created it)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName || null,
        user_type: 'digger',
      }, { onConflict: 'id', ignoreDuplicates: true });

    if (profileError) {
      logStep('Error upserting profile', { error: profileError.message });
      // Non-fatal — the trigger may have created it
    }

    // 3. Check if digger_profile already exists for this user
    const { data: existingDigger } = await supabase
      .from('digger_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingDigger?.id) {
      logStep('Digger profile already exists', { diggerId: existingDigger.id });
      return existingDigger.id;
    }

    // 4. Create digger_profile with pending registration status
    const { data: diggerData, error: diggerError } = await supabase
      .from('digger_profiles')
      .insert({
        user_id: userId,
        business_name: fullName || email.split('@')[0],
        phone: phone || 'pending',
        location: 'pending',
        profession: 'pending',
        registration_status: 'pending',
        subscription_status: 'inactive',
      })
      .select('id')
      .single();

    if (diggerError) {
      logStep('Error creating digger profile', { error: diggerError.message });
      return null;
    }

    logStep('Digger profile created', { diggerId: diggerData.id, userId });

    // 5. Assign digger app role
    const { error: roleError } = await supabase.rpc('insert_user_app_role', {
      p_user_id: userId,
      p_app_role: 'digger',
    });

    if (roleError) {
      logStep('Error assigning digger role', { error: roleError.message });
      // Non-fatal
    }

    return diggerData.id;
  } catch (error) {
    logStep('Error in createDiggerFromLead', { error: String(error) });
    return null;
  }
};

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle Facebook webhook verification (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    logStep('Verification request received', { mode, tokenReceived: !!token });

    const verifyToken = Deno.env.get('FB_WEBHOOK_VERIFY_TOKEN');
    if (!verifyToken) {
      logStep('FB_WEBHOOK_VERIFY_TOKEN not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    if (mode === 'subscribe' && token === verifyToken) {
      logStep('Webhook verified successfully');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    logStep('Verification failed', { mode, tokenMatch: token === verifyToken });
    return new Response('Forbidden', { status: 403 });
  }

  // Handle lead notifications (POST request)
  if (req.method === 'POST') {
    try {
      const appSecret = Deno.env.get('FB_APP_SECRET');
      const accessToken = Deno.env.get('FB_PAGE_ACCESS_TOKEN');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!appSecret || !accessToken) {
        logStep('Missing Facebook credentials');
        return new Response('Server configuration error', { status: 500 });
      }
      if (!supabaseUrl || !supabaseServiceKey) {
        logStep('Missing Supabase credentials');
        return new Response('Server configuration error', { status: 500 });
      }

      const rawBody = await req.text();
      const signature = req.headers.get('x-hub-signature-256');

      if (signature && !verifySignature(rawBody, signature, appSecret)) {
        logStep('Invalid signature - rejecting request');
        return new Response('Invalid signature', { status: 401 });
      }

      const payload: FacebookWebhookPayload = JSON.parse(rawBody);
      logStep('Webhook payload received', {
        object: payload.object,
        entryCount: payload.entry?.length,
      });

      if (payload.object !== 'page') {
        logStep('Not a page event, ignoring');
        return new Response('OK', { status: 200 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      let processedCount = 0;
      let errorCount = 0;

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'leadgen') continue;

          const { leadgen_id, ad_id, campaign_id, page_id, form_id } = change.value;
          logStep('Processing lead', { leadgen_id, ad_id, campaign_id });

          const leadData = await fetchLeadData(leadgen_id, accessToken);
          if (!leadData) {
            errorCount++;
            continue;
          }

          const fields = parseLeadFields(leadData.field_data);
          logStep('Parsed lead fields', { fields });

          const email = fields.email || fields.e_mail || '';
          const fullName = [fields.first_name, fields.last_name].filter(Boolean).join(' ') || fields.full_name || null;
          const phone = fields.phone_number || fields.phone || null;

          if (!email) {
            logStep('No email found in lead data, skipping', { leadgen_id });
            errorCount++;
            continue;
          }

          const leadMetadata = {
            leadgen_id,
            ad_id,
            form_id,
            page_id,
            created_time: leadData.created_time,
            raw_fields: fields,
          };

          // 1. Upsert into subscribers table (for email list)
          const { error: subError } = await supabase
            .from('subscribers')
            .upsert({
              email,
              full_name: fullName,
              phone,
              source: 'facebook_lead_webhook',
              utm_source: 'facebook',
              utm_medium: 'lead_ads',
              utm_campaign: campaign_id || null,
            }, { onConflict: 'email', ignoreDuplicates: false });

          if (subError) {
            logStep('Error upserting subscriber', { error: subError.message });
          }

          // 2. Create digger account (auth user + profile + digger_profile)
          const diggerId = await createDiggerFromLead(
            supabase,
            email,
            fullName,
            phone,
            campaign_id || null,
            leadMetadata,
          );

          if (diggerId) {
            // Link subscriber to digger
            await supabase
              .from('subscribers')
              .update({ converted_to_digger_id: diggerId })
              .eq('email', email);

            logStep('Lead fully processed as digger', { email, diggerId });
            processedCount++;
          } else {
            logStep('Failed to create digger from lead', { email });
            errorCount++;
          }
        }
      }

      logStep('Webhook processing complete', { processedCount, errorCount });

      return new Response(JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      logStep('Webhook processing error', { error: String(error) });
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
