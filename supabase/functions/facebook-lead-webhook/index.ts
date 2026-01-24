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

/**
 * Verify Facebook webhook signature using HMAC SHA-256
 */
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

/**
 * Fetch full lead data from Facebook Graph API
 */
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

/**
 * Parse lead field data into a structured object
 */
const parseLeadFields = (fieldData: FacebookLeadData['field_data']): Record<string, string> => {
  const fields: Record<string, string> = {};
  
  for (const field of fieldData) {
    const name = field.name.toLowerCase().replace(/\s+/g, '_');
    fields[name] = field.values[0] || '';
  }
  
  return fields;
};

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
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
        headers: { 'Content-Type': 'text/plain' }
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

      // Get raw body for signature verification
      const rawBody = await req.text();
      const signature = req.headers.get('x-hub-signature-256');

      // Verify signature (optional but recommended for production)
      if (signature && !verifySignature(rawBody, signature, appSecret)) {
        logStep('Invalid signature - rejecting request');
        return new Response('Invalid signature', { status: 401 });
      }

      const payload: FacebookWebhookPayload = JSON.parse(rawBody);
      logStep('Webhook payload received', { 
        object: payload.object, 
        entryCount: payload.entry?.length 
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
          if (change.field !== 'leadgen') {
            continue;
          }

          const { leadgen_id, ad_id, campaign_id, page_id, form_id } = change.value;
          logStep('Processing lead', { leadgen_id, ad_id, campaign_id });

          // Fetch full lead data from Graph API
          const leadData = await fetchLeadData(leadgen_id, accessToken);
          
          if (!leadData) {
            errorCount++;
            continue;
          }

          // Parse the field data
          const fields = parseLeadFields(leadData.field_data);
          logStep('Parsed lead fields', { fields });

          // Map to subscriber schema
          const subscriber = {
            email: fields.email || fields.e_mail || '',
            full_name: [fields.first_name, fields.last_name].filter(Boolean).join(' ') || fields.full_name || null,
            phone: fields.phone_number || fields.phone || null,
            source: 'facebook_lead_webhook',
            utm_source: 'facebook',
            utm_medium: 'lead_ads',
            utm_campaign: campaign_id || null,
            status: 'active',
            metadata: {
              leadgen_id,
              ad_id,
              form_id,
              page_id,
              created_time: leadData.created_time,
              raw_fields: fields,
            },
          };

          if (!subscriber.email) {
            logStep('No email found in lead data, skipping', { leadgen_id });
            errorCount++;
            continue;
          }

          // Upsert into subscribers table
          const { error } = await supabase
            .from('subscribers')
            .upsert(subscriber, { 
              onConflict: 'email',
              ignoreDuplicates: false 
            });

          if (error) {
            logStep('Error inserting subscriber', { error: error.message, email: subscriber.email });
            errorCount++;
          } else {
            logStep('Subscriber upserted successfully', { email: subscriber.email });
            processedCount++;
          }
        }
      }

      logStep('Webhook processing complete', { processedCount, errorCount });

      return new Response(JSON.stringify({ 
        success: true, 
        processed: processedCount,
        errors: errorCount 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logStep('Webhook processing error', { error: String(error) });
      // Always return 200 to Facebook to prevent retry storms
      return new Response(JSON.stringify({ error: 'Processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
