import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

const BUCKET = "id-verification";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

function normalizeForMatch(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns true if submitted name and address appear to match extracted ID text (fuzzy). */
function textMatchesForm(
  extractedText: string,
  legalName: string,
  streetAddress: string,
  city: string,
  state: string,
  zip: string
): boolean {
  const normalized = normalizeForMatch(extractedText);
  if (normalized.length < 10) return false;

  const nameParts = normalizeForMatch(legalName).split(/\s+/).filter(Boolean);
  for (const part of nameParts) {
    if (part.length < 2) continue;
    if (!normalized.includes(part)) return false;
  }

  const streetNorm = normalizeForMatch(streetAddress);
  if (streetNorm.length >= 5 && !normalized.includes(streetNorm.slice(0, 10))) {
    const firstWord = streetNorm.split(/\s+/)[0];
    if (firstWord && firstWord.length >= 2 && !normalized.includes(firstWord)) return false;
  }

  const cityNorm = normalizeForMatch(city);
  if (cityNorm.length >= 2 && !normalized.includes(cityNorm)) return false;

  const stateNorm = normalizeForMatch(state);
  if (stateNorm.length >= 2 && !normalized.includes(stateNorm)) return false;

  const zipNorm = normalizeForMatch(zip);
  if (zipNorm.length >= 4 && !normalized.includes(zipNorm)) return false;

  return true;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      legalName,
      streetAddress,
      apt,
      city,
      state,
      zip,
      country,
      idType,
      frontFileBase64,
      backFileBase64,
      extractedTextFront,
      extractedTextBack,
      frontMimeType,
      backMimeType,
    } = body;

    if (!legalName?.trim() || !streetAddress?.trim() || !city?.trim() || !state?.trim() || !zip?.trim() || !idType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: legalName, streetAddress, city, state, zip, idType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validIdTypes = ["drivers_license", "passport", "state_id", "green_card", "government_id"];
    if (!validIdTypes.includes(idType)) {
      return new Response(JSON.stringify({ error: "Invalid idType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!frontFileBase64 || typeof frontFileBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Front ID image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submissionId = crypto.randomUUID();
    const basePath = `${user.id}/${submissionId}`;

    const decodeBase64 = (data: string): Uint8Array => {
      const base64 = data.replace(/^data:[\w/+-]+;base64,/, "");
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const mimeToExt = (m: string) => (m === "image/png" ? "png" : m === "image/webp" ? "webp" : m === "application/pdf" ? "pdf" : "jpg");

    let frontPath = "";
    let backPath = "";

    try {
      const frontBytes = decodeBase64(frontFileBase64);
      if (frontBytes.length > MAX_FILE_BYTES) {
        return new Response(JSON.stringify({ error: "Front image too large" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const frontMime = frontMimeType || "image/jpeg";
      const frontExt = mimeToExt(frontMime);
      frontPath = `${basePath}/front.${frontExt}`;
      const { error: frontErr } = await supabaseAdmin.storage.from(BUCKET).upload(frontPath, frontBytes, {
        contentType: frontMime,
        upsert: true,
      });
      if (frontErr) throw new Error(`Upload front: ${frontErr.message}`);
    } catch (e) {
      console.error("Front upload error:", e);
      return new Response(JSON.stringify({ error: "Failed to upload front ID image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (backFileBase64 && typeof backFileBase64 === "string") {
      try {
        const backBytes = decodeBase64(backFileBase64);
        if (backBytes.length <= MAX_FILE_BYTES) {
          const backMime = backMimeType || "image/jpeg";
          const backExt = mimeToExt(backMime);
          backPath = `${basePath}/back.${backExt}`;
          await supabaseAdmin.storage.from(BUCKET).upload(backPath, backBytes, {
            contentType: backMime,
            upsert: true,
          });
        }
      } catch (e) {
        console.error("Back upload error:", e);
      }
    }

    const combinedExtracted = [extractedTextFront, extractedTextBack].filter(Boolean).join(" ");
    const autoApproved =
      !!combinedExtracted.trim() &&
      textMatchesForm(combinedExtracted, legalName, streetAddress, city, state, zip);

    const status = autoApproved ? "approved" : "pending_review";

    const { error: insertErr } = await supabaseAdmin.from("id_verification_submissions").insert({
      id: submissionId,
      user_id: user.id,
      legal_name: legalName.trim(),
      street_address: streetAddress.trim(),
      apt: apt?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: (country || "United States (US)").trim(),
      id_type: idType,
      front_file_path: frontPath,
      back_file_path: backPath || null,
      extracted_text_front: extractedTextFront?.trim() || null,
      extracted_text_back: extractedTextBack?.trim() || null,
      status,
    });

    if (insertErr) {
      console.error("Insert submission error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save submission" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (autoApproved) {
      const nameParts = (legalName || "").trim().split(/\s+/);
      const first_name = nameParts[0] || null;
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update({
          first_name,
          last_name,
          address: streetAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          zip_postal: zip.trim(),
          country: (country || "United States (US)").trim(),
          id_verified: true,
        })
        .eq("id", user.id);

      if (profileErr) {
        console.error("Profile update error:", profileErr);
      } else {
        const { error: syncErr } = await supabaseAdmin.rpc("sync_profile_handle_from_name", {
          p_user_id: user.id,
        });
        if (syncErr) console.error("Sync handle error:", syncErr);
      }

      const locationText = [city.trim(), state.trim(), (country || "United States (US)").trim()].filter(Boolean).join(", ");
      const { data: diggerRows } = await supabaseAdmin
        .from("digger_profiles")
        .select("id")
        .eq("user_id", user.id);
      if (diggerRows?.length) {
        await supabaseAdmin
          .from("digger_profiles")
          .update({
            city: city.trim(),
            state: state.trim(),
            country: (country || "United States (US)").trim(),
            location: locationText || null,
          })
          .eq("user_id", user.id);
      }
    }

    return new Response(
      JSON.stringify({ submissionId, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("submit-id-verification error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
