import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostGigPayload {
  title: string;
  description: string;
  requirements: string;
  budget_min?: number | null;
  budget_max?: number | null;
  timeline: string;
  location?: string;
  work_type?: "remote" | "hybrid" | "onsite" | "flexible";
  client_name: string;
  consumer_email: string;
  consumer_phone?: string | null;
  poster_country?: string | null;
  category_id?: string | null;
  preferred_regions?: string[] | null;
  skills_required?: string[] | null;
  contact_preferences?: string | null;
  /** fixed = one budget for the project; hourly = pay by the hour */
  project_type?: "fixed" | "hourly";
  /** For hourly: client acceptable rate range ($/hr) */
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  /** For hourly: optional estimated hours range */
  estimated_hours_min?: number | null;
  estimated_hours_max?: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = (await req.json()) as PostGigPayload;

    const {
      title,
      description,
      requirements,
      budget_min,
      budget_max,
      timeline,
      location,
      work_type = "remote",
      client_name,
      consumer_email,
      consumer_phone = null,
      poster_country = null,
      category_id = null,
      preferred_regions = null,
      skills_required = null,
      contact_preferences = null,
      project_type = "fixed",
      hourly_rate_min = null,
      hourly_rate_max = null,
      estimated_hours_min = null,
      estimated_hours_max = null,
    } = body;

    const locationDisplay = location?.trim() || (work_type === "remote" ? "Remote" : work_type === "hybrid" ? "Hybrid" : work_type === "onsite" ? "On-site" : "Flexible");

    if (!title?.trim() || !description?.trim()) {
      return new Response(
        JSON.stringify({ error: "title and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isHourly = project_type === "hourly";

    // Only giggers can post gigs: require auth and gigger role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "You must be signed in to post a project." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: giggerRole } = await supabase
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "gigger")
      .eq("is_active", true)
      .maybeSingle();

    if (!giggerRole) {
      return new Response(
        JSON.stringify({ error: "Only giggers can post projects. Please switch to your gigger account or sign up as a gigger." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consumerId = user.id;

    // Lead price: 8% of budget midpoint (fixed) or estimated total (hourly: rate * hours), $3–$49
    let bMin: number | null = budget_min ?? null;
    let bMax: number | null = budget_max ?? null;
    if (isHourly) {
      const rateMin = hourly_rate_min != null ? Number(hourly_rate_min) : 0;
      const rateMax = hourly_rate_max != null ? Number(hourly_rate_max) : rateMin;
      const hoursMin = estimated_hours_min != null ? Number(estimated_hours_min) : 0;
      const hoursMax = estimated_hours_max != null ? Number(estimated_hours_max) : hoursMin;
      const avgRate = (rateMin + (rateMax || rateMin)) / 2;
      const avgHours = (hoursMin + (hoursMax || hoursMin)) / 2;
      const estimatedTotal = avgRate * Math.max(avgHours, 1);
      if (estimatedTotal > 0) {
        bMin = Math.round(estimatedTotal * 0.8);
        bMax = Math.round(estimatedTotal * 1.2);
      }
    }
    const bMinNum = bMin ?? 0;
    const bMaxNum = bMax ?? 0;
    const avgBudget = (bMinNum + bMaxNum) / 2;
    let calculatedPriceCents: number | null = null;
    if (avgBudget > 0) {
      const priceDollars = Math.round(avgBudget * 0.08);
      const clamped = Math.min(49, Math.max(3, priceDollars));
      calculatedPriceCents = clamped * 100;
    }

    const insertPayload: Record<string, unknown> = {
      consumer_id: consumerId,
      title: title.trim(),
      description: description.trim(),
      requirements: requirements?.trim() ?? null,
      budget_min: isHourly ? null : bMinNum,
      budget_max: isHourly ? null : bMaxNum,
      calculated_price_cents: calculatedPriceCents,
      timeline: timeline ?? null,
      location: locationDisplay,
      work_type: ["remote", "hybrid", "onsite", "flexible"].includes(work_type) ? work_type : "remote",
      client_name: (client_name ?? "").trim(),
      consumer_email: (consumer_email ?? "").trim(),
      consumer_phone: consumer_phone?.trim() || null,
      poster_country: (poster_country && typeof poster_country === "string" && poster_country.trim()) ? poster_country.trim() : null,
      category_id: category_id || null,
      status: "open",
      confirmation_status: "confirmed",
      is_confirmed_lead: true,
      confirmed_at: new Date().toISOString(),
      preferred_regions: Array.isArray(preferred_regions) && preferred_regions.length > 0 ? preferred_regions : null,
      skills_required: Array.isArray(skills_required) && skills_required.length > 0 ? skills_required.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map(s => s.trim()) : null,
      contact_preferences: typeof contact_preferences === "string" && contact_preferences.trim() ? contact_preferences.trim() : null,
      project_type: isHourly ? "hourly" : "fixed",
    };
    if (isHourly) {
      insertPayload.hourly_rate_min = hourly_rate_min != null ? Number(hourly_rate_min) : null;
      insertPayload.hourly_rate_max = hourly_rate_max != null ? Number(hourly_rate_max) : null;
      insertPayload.estimated_hours_min = estimated_hours_min != null ? Number(estimated_hours_min) : null;
      insertPayload.estimated_hours_max = estimated_hours_max != null ? Number(estimated_hours_max) : null;
    }

    const { data: gig, error } = await supabase
      .from("gigs")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[post-gig] Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Digger notification is handled by the client calling send-gig-email-by-settings once
    // (avoids duplicate emails from both blast-lead-to-diggers and send-gig-email-by-settings).

    return new Response(
      JSON.stringify({ data: gig }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[post-gig] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
