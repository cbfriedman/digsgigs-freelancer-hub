import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-TEST-LEAD-DISTRIBUTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    // Check admin role
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (!adminRole) {
      throw new Error("Admin access required");
    }
    
    logStep("Admin authenticated", { userId: user.id });

    const body = await req.json();
    const { action, gigId, exclusivityType, diggerId } = body;
    
    logStep("Request received", { action, gigId, exclusivityType, diggerId });

    switch (action) {
      case 'get-system-status': {
        // Get counts of queue entries and purchases
        const [queueResult, purchasesResult, gigsResult, diggersResult] = await Promise.all([
          supabaseClient.from('lead_exclusivity_queue').select('*', { count: 'exact' }),
          supabaseClient.from('lead_purchases').select('*', { count: 'exact' }),
          supabaseClient.from('gigs').select('id, title, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
          supabaseClient.from('digger_profiles').select('id, business_name, profession, naics_code, sic_code', { count: 'exact' }).limit(20),
        ]);
        
        // Get queue breakdown by status
        const { data: queueBreakdown } = await supabaseClient
          .from('lead_exclusivity_queue')
          .select('status, exclusivity_type')
          .order('created_at', { ascending: false });
        
        const statusCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        queueBreakdown?.forEach(entry => {
          statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
          typeCounts[entry.exclusivity_type || 'unknown'] = (typeCounts[entry.exclusivity_type || 'unknown'] || 0) + 1;
        });
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            queueCount: queueResult.count || 0,
            queueByStatus: statusCounts,
            queueByType: typeCounts,
            purchasesCount: purchasesResult.count || 0,
            recentGigs: gigsResult.data || [],
            gigsCount: gigsResult.count || 0,
            diggerProfiles: diggersResult.data || [],
            diggersCount: diggersResult.count || 0,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'preview-matching': {
        if (!gigId) throw new Error("gigId required for preview");
        
        // Get gig details
        const { data: gig, error: gigError } = await supabaseClient
          .from('gigs')
          .select('*')
          .eq('id', gigId)
          .single();
        
        if (gigError || !gig) throw new Error("Gig not found");
        
        logStep("Gig found for preview", { title: gig.title, naics: gig.naics_codes, sic: gig.sic_codes });
        
        // Find matching diggers based on industry codes
        let matchingDiggers: any[] = [];
        
        if (gig.naics_codes?.length > 0 || gig.sic_codes?.length > 0) {
          const { data: diggers, error: diggersError } = await supabaseClient
            .from('digger_profiles')
            .select('id, business_name, profession, naics_code, sic_code, user_id')
            .limit(50);
          
          if (!diggersError && diggers) {
            matchingDiggers = diggers.filter(digger => {
              const diggerNaics = digger.naics_code || [];
              const diggerSic = digger.sic_code || [];
              const gigNaics = gig.naics_codes || [];
              const gigSic = gig.sic_codes || [];
              
              const naicsMatch = diggerNaics.some((code: string) => gigNaics.includes(code));
              const sicMatch = diggerSic.some((code: string) => gigSic.includes(code));
              
              return naicsMatch || sicMatch;
            });
          }
        }
        
        // Check existing purchases
        const { data: existingPurchases } = await supabaseClient
          .from('lead_purchases')
          .select('digger_id, exclusivity_type, status')
          .eq('gig_id', gigId);
        
        // Check existing queue entries
        const { data: existingQueue } = await supabaseClient
          .from('lead_exclusivity_queue')
          .select('digger_id, exclusivity_type, status, queue_position')
          .eq('gig_id', gigId);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            gig: {
              id: gig.id,
              title: gig.title,
              description: gig.description,
              location: gig.location,
              naics_codes: gig.naics_codes,
              sic_codes: gig.sic_codes,
              is_confirmed_lead: gig.is_confirmed_lead,
              status: gig.status,
            },
            matchingDiggers: matchingDiggers.map(d => ({
              id: d.id,
              business_name: d.business_name,
              profession: d.profession,
              naics_code: d.naics_code,
              sic_code: d.sic_code,
            })),
            matchCount: matchingDiggers.length,
            existingPurchases: existingPurchases || [],
            existingQueue: existingQueue || [],
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'trigger-matching': {
        if (!gigId || !exclusivityType) {
          throw new Error("gigId and exclusivityType required");
        }
        
        logStep("Triggering match-leads-to-diggers", { gigId, exclusivityType });
        
        // Call the match-leads-to-diggers function
        const { data: matchResult, error: matchError } = await supabaseClient.functions.invoke(
          'match-leads-to-diggers',
          { body: { gigId, exclusivityType } }
        );
        
        if (matchError) {
          throw new Error(`Match function failed: ${matchError.message}`);
        }
        
        logStep("Match result", matchResult);
        
        return new Response(JSON.stringify({
          success: true,
          data: matchResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'trigger-expiration-check': {
        logStep("Triggering handle-exclusivity-expiration");
        
        const { data: expirationResult, error: expirationError } = await supabaseClient.functions.invoke(
          'handle-exclusivity-expiration',
          { body: {} }
        );
        
        if (expirationError) {
          throw new Error(`Expiration check failed: ${expirationError.message}`);
        }
        
        logStep("Expiration check result", expirationResult);
        
        return new Response(JSON.stringify({
          success: true,
          data: expirationResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'trigger-semi-exclusive-expiration': {
        logStep("Triggering handle-semi-exclusive-expiration");
        
        const { data: semiExpirationResult, error: semiExpirationError } = await supabaseClient.functions.invoke(
          'handle-semi-exclusive-expiration',
          { body: {} }
        );
        
        if (semiExpirationError) {
          throw new Error(`Semi-exclusive expiration check failed: ${semiExpirationError.message}`);
        }
        
        logStep("Semi-exclusive expiration result", semiExpirationResult);
        
        return new Response(JSON.stringify({
          success: true,
          data: semiExpirationResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'get-queue-details': {
        const { data: queueEntries, error: queueError } = await supabaseClient
          .from('lead_exclusivity_queue')
          .select(`
            *,
            digger_profiles (id, business_name, profession),
            gigs (id, title, status)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (queueError) throw queueError;
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            entries: queueEntries || [],
            count: queueEntries?.length || 0,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'get-purchase-details': {
        const { data: purchases, error: purchasesError } = await supabaseClient
          .from('lead_purchases')
          .select(`
            *,
            digger_profiles (id, business_name, profession),
            gigs (id, title, status)
          `)
          .order('purchased_at', { ascending: false })
          .limit(50);
        
        if (purchasesError) throw purchasesError;
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            purchases: purchases || [],
            count: purchases?.length || 0,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case 'simulate-purchase': {
        if (!gigId || !diggerId || !exclusivityType) {
          throw new Error("gigId, diggerId, and exclusivityType required for simulation");
        }
        
        // Get gig
        const { data: gig } = await supabaseClient
          .from('gigs')
          .select('consumer_id, title')
          .eq('id', gigId)
          .single();
        
        if (!gig) throw new Error("Gig not found");
        
        // Check exclusivity constraints
        let blockReason: string | null = null;
        
        if (exclusivityType === 'exclusive-24h') {
          const { data: existingExclusive } = await supabaseClient
            .from('lead_purchases')
            .select('id, digger_id')
            .eq('gig_id', gigId)
            .eq('exclusivity_type', 'exclusive-24h')
            .eq('status', 'completed')
            .neq('digger_id', diggerId)
            .limit(1);
          
          if (existingExclusive && existingExclusive.length > 0) {
            blockReason = "Another digger already has exclusive access to this lead";
          }
        }
        
        if (exclusivityType === 'semi-exclusive') {
          const { data: existingSemiExclusive } = await supabaseClient
            .from('lead_purchases')
            .select('id, digger_id')
            .eq('gig_id', gigId)
            .eq('exclusivity_type', 'semi-exclusive')
            .eq('status', 'completed');
          
          const count = existingSemiExclusive?.length || 0;
          if (count >= 4) {
            blockReason = "Semi-exclusive limit (4) reached for this lead";
          } else if (existingSemiExclusive?.some(p => p.digger_id === diggerId)) {
            blockReason = "This digger already has semi-exclusive access to this lead";
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            canPurchase: !blockReason,
            blockReason,
            gig: { id: gigId, title: gig.title },
            diggerId,
            exclusivityType,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});