import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SavedSearch {
  id: string;
  user_id: string;
  search_type: string;
  name: string;
  filters: any;
  email_alerts_enabled: boolean;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active saved searches with email alerts enabled
    const { data: savedSearches, error: searchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("email_alerts_enabled", true);

    if (searchError) throw searchError;

    console.log(`Processing ${savedSearches?.length || 0} saved searches`);

    let emailsSent = 0;

    for (const search of savedSearches || []) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", search.user_id)
          .single();

        if (!profile?.email) continue;

        let matches: any[] = [];

        if (search.search_type === "gigs") {
          // Search for matching gigs
          matches = await findMatchingGigs(supabase, search);
        } else if (search.search_type === "diggers") {
          // Search for matching diggers
          matches = await findMatchingDiggers(supabase, search);
        }

        // Only send email if there are new matches
        if (matches.length > 0) {
          await sendAlertEmail(
            profile.email,
            profile.full_name || "there",
            search.name,
            search.search_type,
            matches
          );
          emailsSent++;
          console.log(`Sent alert for search: ${search.name} to ${profile.email}`);
        }
      } catch (error) {
        console.error(`Error processing search ${search.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: savedSearches?.length || 0,
        emailsSent 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function findMatchingGigs(supabase: any, search: SavedSearch): Promise<any[]> {
  const filters = search.filters;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("gigs")
    .select("*, categories(name)")
    .eq("status", "open")
    .gte("created_at", oneDayAgo);

  // Apply budget filter
  if (filters.budgetRange) {
    query = query
      .gte("budget_min", filters.budgetRange[0])
      .lte("budget_max", filters.budgetRange[1]);
  }

  // Apply category filter
  if (filters.selectedCategories && filters.selectedCategories.length > 0) {
    query = query.in("category_id", filters.selectedCategories);
  }

  const { data } = await query.limit(10);
  return data || [];
}

async function findMatchingDiggers(supabase: any, search: SavedSearch): Promise<any[]> {
  const filters = search.filters;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("digger_profiles")
    .select("*, profiles!digger_profiles_user_id_fkey(full_name), digger_categories(categories(name))")
    .gte("created_at", oneDayAgo);

  // Apply hourly rate filter
  if (filters.hourlyRateRange) {
    query = query
      .gte("hourly_rate_min", filters.hourlyRateRange[0])
      .lte("hourly_rate_max", filters.hourlyRateRange[1]);
  }

  // Apply rating filter
  if (filters.minRating) {
    query = query.gte("average_rating", filters.minRating);
  }

  // Apply response time filter
  if (filters.maxResponseTime) {
    query = query.lte("response_time_hours", filters.maxResponseTime);
  }

  // Apply credentials filters
  if (filters.isInsured) {
    query = query.eq("is_insured", true);
  }
  if (filters.isBonded) {
    query = query.eq("is_bonded", true);
  }
  if (filters.isLicensed) {
    query = query.eq("is_licensed", "yes");
  }

  const { data } = await query.limit(10);

  // Filter by categories if needed
  if (filters.selectedCategories && filters.selectedCategories.length > 0 && data) {
    return data.filter((digger: any) =>
      digger.digger_categories.some((dc: any) =>
        filters.selectedCategories.includes(dc.categories.id)
      )
    );
  }

  return data || [];
}

async function sendAlertEmail(
  email: string,
  name: string,
  searchName: string,
  searchType: string,
  matches: any[]
): Promise<void> {
  // Use Resend API directly via fetch
  const resendUrl = "https://api.resend.com/emails";
  const itemType = searchType === "gigs" ? "gigs" : "professionals";
  const itemsHtml = matches
    .slice(0, 5)
    .map((item) => {
      if (searchType === "gigs") {
        return `
          <li style="margin-bottom: 15px;">
            <strong>${item.title}</strong><br>
            Budget: $${item.budget_min || 0} - $${item.budget_max || "TBD"}<br>
            Category: ${item.categories?.name || "Uncategorized"}
          </li>
        `;
      } else {
        return `
          <li style="margin-bottom: 15px;">
            <strong>${item.handle || item.profiles?.full_name || "Professional"}</strong><br>
            Rate: $${item.hourly_rate_min || 0} - $${item.hourly_rate_max || "TBD"}/hr<br>
            Rating: ${item.average_rating || "N/A"} ⭐<br>
            Experience: ${item.years_experience || "N/A"} years
          </li>
        `;
      }
    })
    .join("");

  const emailPayload = {
    from: "Lovable <onboarding@resend.dev>",
    to: [email],
    subject: `New matches for your saved search: ${searchName}`,
    html: `
      <h1>Hi ${name}!</h1>
      <p>We found ${matches.length} new ${itemType} matching your saved search "<strong>${searchName}</strong>":</p>
      <ul style="list-style-type: none; padding-left: 0;">
        ${itemsHtml}
      </ul>
      ${matches.length > 5 ? `<p>...and ${matches.length - 5} more!</p>` : ""}
      <p>
        <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/browse-${searchType}" 
           style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View All Matches
        </a>
      </p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        You're receiving this email because you have email alerts enabled for this saved search. 
        You can manage your saved searches and email preferences in your account settings.
      </p>
    `
  };

  const response = await fetch(resendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}
