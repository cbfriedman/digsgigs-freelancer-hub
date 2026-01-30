import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function runs on a schedule (every 10 minutes) to send delayed lead blasts
 * to non-Pro diggers and subscribers. Leads are sent 2 hours after the Pro blast.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[delayed-lead-blast] Starting delayed blast check...");

    // Find leads that:
    // 1. Have been sent to Pro diggers (pro_blast_sent_at is set)
    // 2. Haven't been sent to non-Pro yet (non_pro_blast_sent_at is null)
    // 3. Pro blast was sent more than 2 hours ago
    // 4. Lead is still active (status = 'open')
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: pendingLeads, error: fetchError } = await supabase
      .from("gigs")
      .select("id, title")
      .not("pro_blast_sent_at", "is", null)
      .is("non_pro_blast_sent_at", null)
      .lt("pro_blast_sent_at", twoHoursAgo)
      .eq("status", "open")
      .limit(10); // Process up to 10 leads per run

    if (fetchError) {
      throw new Error(`Error fetching pending leads: ${fetchError.message}`);
    }

    if (!pendingLeads || pendingLeads.length === 0) {
      console.log("[delayed-lead-blast] No pending leads to process");
      return new Response(
        JSON.stringify({ success: true, message: "No pending leads", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delayed-lead-blast] Found ${pendingLeads.length} leads ready for non-Pro blast`);

    const results: any[] = [];

    // Process each lead by calling the blast function with proOnly=false
    for (const lead of pendingLeads) {
      try {
        console.log(`[delayed-lead-blast] Triggering non-Pro blast for lead: ${lead.id} (${lead.title})`);
        
        const { data, error } = await supabase.functions.invoke("blast-lead-to-diggers", {
          body: { leadId: lead.id, proOnly: false }
        });

        if (error) {
          console.error(`[delayed-lead-blast] Error blasting lead ${lead.id}:`, error);
          results.push({ leadId: lead.id, success: false, error: error.message });
        } else {
          console.log(`[delayed-lead-blast] Successfully blasted lead ${lead.id}:`, data);
          results.push({ leadId: lead.id, success: true, ...data });
        }
      } catch (err: any) {
        console.error(`[delayed-lead-blast] Exception for lead ${lead.id}:`, err);
        results.push({ leadId: lead.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[delayed-lead-blast] Complete. Processed ${successCount}/${pendingLeads.length} leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingLeads.length,
        successful: successCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[delayed-lead-blast] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
