import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

/* ---------- helpers ---------- */

const log = (step: string, details?: Record<string, unknown>) =>
  console.log(`[fb-gig-webhook] ${step}`, details ? JSON.stringify(details) : "");

const verifySignature = (
  payload: string,
  signature: string | null,
  appSecret: string,
): boolean => {
  if (!signature) return false;
  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(payload).digest("hex");
  return signature === expected;
};

/* ---------- Graph API lead fetch ---------- */

interface FBFieldData {
  name: string;
  values: string[];
}

const fetchLeadData = async (
  leadgenId: string,
  accessToken: string,
): Promise<{ id: string; created_time: string; field_data: FBFieldData[] } | null> => {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      log("Graph API error", { status: res.status, body: await res.text() });
      return null;
    }
    return await res.json();
  } catch (e) {
    log("fetchLeadData error", { error: String(e) });
    return null;
  }
};

const fieldMap = (fields: FBFieldData[]): Record<string, string> => {
  const m: Record<string, string> = {};
  for (const f of fields) {
    m[f.name.toLowerCase().replace(/\s+/g, "_")] = f.values[0] || "";
  }
  return m;
};

/* ---------- budget parser ---------- */

/** Parse a dropdown value like "$500-$1000" or "Under $500" into min/max */
const parseBudgetRange = (
  raw: string | undefined,
): { min: number | null; max: number | null } => {
  if (!raw) return { min: null, max: null };
  const cleaned = raw.replace(/,/g, "");

  // "Under $X"
  const underMatch = cleaned.match(/under\s*\$?(\d+)/i);
  if (underMatch) return { min: null, max: parseInt(underMatch[1]) };

  // "$X+" or "Over $X"
  const overMatch = cleaned.match(/(?:over|\$?(\d+)\s*\+)/i);
  if (overMatch) {
    const val = parseInt(overMatch[1] || cleaned.replace(/\D/g, ""));
    return { min: val, max: null };
  }

  // "$X - $Y" or "$X-$Y"
  const rangeMatch = cleaned.match(/\$?(\d+)\s*[-–—]\s*\$?(\d+)/);
  if (rangeMatch)
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };

  // Single number
  const singleMatch = cleaned.match(/\$?(\d+)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1]);
    return { min: val, max: val };
  }

  return { min: null, max: null };
};

/* ---------- confirmation email ---------- */

const sendConfirmationEmail = async (
  resend: InstanceType<typeof Resend>,
  email: string,
  gigId: string,
  title: string,
  description: string,
  location: string,
  budgetMin: number | null,
  budgetMax: number | null,
) => {
  const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";
  const confirmUrl = `${siteUrl}/confirm-gig?gigId=${gigId}`;

  let budgetText = "Not specified";
  if (budgetMin && budgetMax) budgetText = `$${budgetMin.toLocaleString()} – $${budgetMax.toLocaleString()}`;
  else if (budgetMin) budgetText = `$${budgetMin.toLocaleString()}+`;
  else if (budgetMax) budgetText = `Up to $${budgetMax.toLocaleString()}`;

  await resend.emails.send({
    from: "Digs and Gigs <noreply@digsandgigs.net>",
    to: [email],
    subject: "Confirm your project to get matched with pros 🛠️",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;border-radius:10px 10px 0 0;text-align:center}
.content{background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none}
.details{background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0}
.row{margin:10px 0;padding:10px 0;border-bottom:1px solid #e0e0e0}
.row:last-child{border-bottom:none}
.label{font-weight:bold;color:#667eea;display:inline-block;width:110px}
.btn{display:inline-block;background:#667eea;color:#fff;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;margin:20px 0}
.footer{text-align:center;color:#898989;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0}
</style></head><body>
<div class="header">
  <h1 style="margin:0;font-size:28px">You're One Click Away!</h1>
  <p style="margin:10px 0 0;opacity:.9">Confirm your project and we'll start matching you with qualified pros.</p>
</div>
<div class="content">
  <p>Hi there! 👋</p>
  <p>Thanks for submitting your project through our ad. Please confirm the details below so we can start finding you the right professional.</p>
  <div class="details">
    <h2 style="margin-top:0;color:#667eea">Your Project</h2>
    <div class="row"><span class="label">Project:</span><span>${title}</span></div>
    <div class="row"><span class="label">Location:</span><span>${location || "Not specified"}</span></div>
    <div class="row"><span class="label">Budget:</span><span>${budgetText}</span></div>
    <div class="row"><span class="label">Description:</span><p style="margin:5px 0 0">${description}</p></div>
  </div>
  <div style="text-align:center"><a href="${confirmUrl}" class="btn">✓ Confirm & Get Matched</a></div>
  <p style="margin-top:24px"><strong>📋 What happens next?</strong></p>
  <ol><li>Click the button above to confirm</li><li>We match you with qualified professionals</li><li>Pros reach out with quotes and availability</li><li>Compare options and pick the best fit!</li></ol>
  <div class="footer">
    <p>Didn't request this? Just ignore this email.</p>
    <p>© ${new Date().getFullYear()} Digs and Gigs. All rights reserved.</p>
  </div>
</div>
</body></html>`,
  });

  log("Confirmation email sent", { email, gigId });
};

/* ---------- main handler ---------- */

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  /* ---- GET: Facebook verification ---- */
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("FB_GIG_WEBHOOK_VERIFY_TOKEN") || Deno.env.get("FB_WEBHOOK_VERIFY_TOKEN");
    if (!verifyToken) {
      log("Missing verify token env var");
      return new Response("Server config error", { status: 500 });
    }

    if (mode === "subscribe" && token === verifyToken) {
      log("Webhook verified");
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  /* ---- POST: Lead notification ---- */
  if (req.method === "POST") {
    try {
      const appSecret = Deno.env.get("FB_APP_SECRET");
      const accessToken = Deno.env.get("FB_PAGE_ACCESS_TOKEN");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const resendKey = Deno.env.get("RESEND_API_KEY");

      if (!appSecret || !accessToken) {
        log("Missing FB credentials");
        return new Response("Config error", { status: 500 });
      }
      if (!supabaseUrl || !serviceKey) {
        log("Missing Supabase credentials");
        return new Response("Config error", { status: 500 });
      }

      const rawBody = await req.text();
      const sig = req.headers.get("x-hub-signature-256");
      if (sig && !verifySignature(rawBody, sig, appSecret)) {
        log("Invalid signature");
        return new Response("Invalid signature", { status: 401 });
      }

      const payload = JSON.parse(rawBody);
      if (payload.object !== "page") {
        return new Response("OK", { status: 200 });
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const resend = resendKey ? new Resend(resendKey) : null;

      let processed = 0;
      let errors = 0;

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "leadgen") continue;

          const { leadgen_id, campaign_id, ad_id, page_id, form_id } = change.value;
          log("Processing lead", { leadgen_id });

          const leadData = await fetchLeadData(leadgen_id, accessToken);
          if (!leadData) { errors++; continue; }

          const f = fieldMap(leadData.field_data);
          log("Parsed fields", { fields: f });

          // Map fields — Facebook pre-fills email, full_name, phone_number
          const email = f.email || f.e_mail || "";
          const fullName =
            [f.first_name, f.last_name].filter(Boolean).join(" ") ||
            f.full_name ||
            null;
          const phone = f.phone_number || f.phone || null;

          // Custom fields from the lead form
          const projectTitle = f.project_title || f.what_do_you_need_done_ || f.title || "Untitled Project";
          const projectDescription =
            f.project_description || f.describe_your_project || f.description || "";
          const budgetRaw = f.budget_range || f.budget || f.estimated_budget || "";
          const timelineRaw = f.timeline || f.when_do_you_need_this_ || f.when_do_you_need_this_done_ || "";
          const categoryRaw = f.service_category || f.category || f.what_type_of_service_ || "";
          const locationRaw = f.project_location || f.location || f.city || "";

          if (!email) {
            log("No email, skipping", { leadgen_id });
            errors++;
            continue;
          }

          const { min: budgetMin, max: budgetMax } = parseBudgetRange(budgetRaw);

          // Calculate lead price (same logic as post-gig)
          const bMinNum = budgetMin ?? 0;
          const bMaxNum = budgetMax ?? bMinNum;
          const avgBudget = (bMinNum + bMaxNum) / 2;
          let calculatedPriceCents: number | null = null;
          if (avgBudget > 0) {
            const fromRate = Math.round(avgBudget * 0.03);
            calculatedPriceCents = Math.min(69, Math.max(20, fromRate)) * 100;
          }

          // 1. Create or find auth user for the gigger (client)
          const randomPw = crypto.randomUUID() + crypto.randomUUID();
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password: randomPw,
            email_confirm: true,
            user_metadata: { full_name: fullName || "", source: "facebook_gig_lead" },
          });

          let userId: string;
          if (authErr) {
            if (
              authErr.message?.includes("already been registered") ||
              authErr.message?.includes("duplicate")
            ) {
              const { data: lookup } = await (supabase as any)
                .from("profiles")
                .select("id")
                .eq("email", email)
                .maybeSingle();
              if (!lookup?.id) {
                log("Cannot find existing profile", { email });
                errors++;
                continue;
              }
              userId = lookup.id;
              log("Using existing user", { userId });
            } else {
              log("Auth error", { error: authErr.message });
              errors++;
              continue;
            }
          } else {
            userId = authData.user.id;
            log("Created auth user", { userId });
          }

          // Ensure gigger role
          await (supabase as any).rpc("insert_user_app_role", {
            p_user_id: userId,
            p_app_role: "gigger",
          });

          // 2. Upsert profile
          await (supabase as any).from("profiles").upsert(
            {
              id: userId,
              email,
              full_name: fullName || null,
              user_type: "consumer",
            },
            { onConflict: "id", ignoreDuplicates: true },
          );

          // 3. Insert gig with pending confirmation
          const { data: gig, error: gigErr } = await (supabase as any)
            .from("gigs")
            .insert({
              consumer_id: userId,
              title: projectTitle.trim(),
              description: projectDescription.trim() || "Project submitted via Facebook ad",
              requirements: null,
              budget_min: budgetMin,
              budget_max: budgetMax,
              calculated_price_cents: calculatedPriceCents,
              timeline: timelineRaw || null,
              location: locationRaw || "Not specified",
              work_type: "flexible",
              client_name: fullName || email.split("@")[0],
              consumer_email: email,
              consumer_phone: phone || null,
              status: "open",
              confirmation_status: "pending",
              is_confirmed_lead: false,
              project_type: "fixed",
              skills_required: categoryRaw ? [categoryRaw] : null,
            })
            .select("id")
            .single();

          if (gigErr) {
            log("Gig insert error", { error: gigErr.message });
            errors++;
            continue;
          }

          log("Gig created (pending confirmation)", { gigId: gig.id, email });

          // 4. Also upsert into subscribers for marketing
          await (supabase as any).from("subscribers").upsert(
            {
              email,
              full_name: fullName,
              phone,
              source: "facebook_gig_lead",
              utm_source: "facebook",
              utm_medium: "lead_ads",
              utm_campaign: campaign_id || null,
            },
            { onConflict: "email", ignoreDuplicates: false },
          );

          // 5. Send confirmation email
          if (resend) {
            try {
              await sendConfirmationEmail(
                resend,
                email,
                gig.id,
                projectTitle,
                projectDescription || "Project submitted via Facebook ad",
                locationRaw || "Not specified",
                budgetMin,
                budgetMax,
              );
            } catch (emailErr) {
              log("Email send error (non-fatal)", { error: String(emailErr) });
            }
          }

          // 6. Notify admins
          try {
            const adminEmails = ["coby@cfcontracting.com", "webservicewang@gmail.com"];
            if (resend) {
              await resend.emails.send({
                from: "Digs and Gigs <noreply@digsandgigs.net>",
                to: adminEmails,
                subject: `[FB Lead] New project: ${projectTitle}`,
                html: `<p>A new project was submitted via Facebook Lead Ad.</p>
<ul>
<li><strong>Title:</strong> ${projectTitle}</li>
<li><strong>Client:</strong> ${fullName || "N/A"} (${email})</li>
<li><strong>Budget:</strong> ${budgetRaw || "N/A"}</li>
<li><strong>Timeline:</strong> ${timelineRaw || "N/A"}</li>
<li><strong>Category:</strong> ${categoryRaw || "N/A"}</li>
<li><strong>Location:</strong> ${locationRaw || "N/A"}</li>
<li><strong>Status:</strong> Pending confirmation</li>
</ul>
<p>Gig ID: ${gig.id}</p>`,
              });
            }
          } catch (_) { /* non-fatal */ }

          processed++;
        }
      }

      log("Done", { processed, errors });
      return new Response(
        JSON.stringify({ success: true, processed, errors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      log("Unhandled error", { error: String(e) });
      return new Response(JSON.stringify({ error: "Processing error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
