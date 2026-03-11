import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runModeration, normalizeText } from "../_shared/moderation/index.ts";
import type { ModerationResult } from "../_shared/moderation/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  conversation_id: string;
  content: string;
  attachments?: { name: string; path: string; type: string }[];
  metadata?: Record<string, unknown>;
}

interface SuccessResponse {
  ok: true;
  decision: "allow" | "flag";
  message_id: string;
  user_facing_message?: string;
}

interface BlockResponse {
  ok: false;
  decision: "block" | "shadow_block";
  user_facing_message: string;
  retry_allowed: boolean;
  safe_reason_codes: string[];
}

type ApiResponse = SuccessResponse | BlockResponse;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, serviceKey);
    const supabaseService = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const conversationId = body.conversation_id;
    let content = typeof body.content === "string" ? body.content : "";
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const metadata = body.metadata ?? null;

    if (!conversationId || typeof conversationId !== "string") {
      return new Response(
        JSON.stringify({ error: "conversation_id is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const hasContent = content != null && String(content).trim() !== "";
    const hasAttachments = attachments.length > 0;
    if (!hasContent && !hasAttachments) {
      return new Response(
        JSON.stringify({ error: "Message must have content or at least one attachment" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    content = hasContent ? String(content).trim() : "";

    if (content.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message must be 5000 characters or less" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { data: conv, error: convError } = await supabaseService
      .from("conversations")
      .select("id, consumer_id, digger_id, admin_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let recipientUserId: string | null = null;
    if (conv.admin_id) {
      recipientUserId = user.id === conv.admin_id ? conv.consumer_id : conv.admin_id;
    } else {
      if (user.id === conv.consumer_id && conv.digger_id) {
        const { data: dp } = await supabaseService
          .from("digger_profiles")
          .select("user_id")
          .eq("id", conv.digger_id)
          .single();
        recipientUserId = dp?.user_id ?? null;
      } else {
        recipientUserId = conv.consumer_id;
      }
    }

    const { data: profile } = await supabaseService
      .from("user_moderation_profile")
      .select("muted_until, is_banned")
      .eq("user_id", user.id)
      .single();

    const muted = profile?.muted_until
      ? new Date(profile.muted_until) > new Date()
      : false;
    const banned = profile?.is_banned ?? false;

    const dbRules: { id: string; category: string; rule_name: string; pattern: string; severity: string; score: number; enabled: boolean }[] = [];
    const { data: rules } = await supabaseService
      .from("moderation_rules")
      .select("id, category, rule_name, pattern, severity, score, enabled")
      .eq("enabled", true);
    if (rules) dbRules.push(...rules);

    // Admin-configurable sensitivity (platform_settings.message_moderation)
    let scoringOptions: { thresholdBlock?: number; thresholdFlag?: number; blockOnContactKeywords?: boolean } | undefined;
    const { data: modSetting } = await supabaseService
      .from("platform_settings")
      .select("value")
      .eq("key", "message_moderation")
      .maybeSingle();
    if (modSetting?.value && typeof modSetting.value === "object") {
      const v = modSetting.value as { threshold_block?: number; threshold_flag?: number; block_on_contact_keywords?: boolean };
      if (typeof v.threshold_block === "number" || typeof v.threshold_flag === "number" || typeof v.block_on_contact_keywords === "boolean") {
        scoringOptions = {};
        if (typeof v.threshold_block === "number") scoringOptions.thresholdBlock = v.threshold_block;
        if (typeof v.threshold_flag === "number") scoringOptions.thresholdFlag = v.threshold_flag;
        if (typeof v.block_on_contact_keywords === "boolean") scoringOptions.blockOnContactKeywords = v.block_on_contact_keywords;
      }
    }

    const moderationResult = runModeration(
      { content, dbRules },
      { muted, banned },
      scoringOptions
    ) as ModerationResult;

    const { raw, normalized } = normalizeText(content);

    const eventPayload = {
      conversation_id: conversationId,
      user_id: user.id,
      recipient_id: recipientUserId,
      decision: moderationResult.decision,
      total_score: moderationResult.totalScore,
      severity: moderationResult.severity,
      reasons: moderationResult.reasons,
      matches: moderationResult.matches.map((m) => ({
        ruleId: m.ruleId,
        category: m.category,
        snippet: m.snippet,
        severity: m.severity,
        score: m.score,
      })),
      detector_results: moderationResult.detectorResults.map((dr) => ({
        detector: dr.detector,
        totalScore: dr.totalScore,
        blocked: dr.blocked,
      })),
      content_preview: raw.slice(0, 200),
    };

    if (moderationResult.decision === "block" || moderationResult.decision === "shadow_block") {
      await supabaseService.from("message_moderation_events").insert({
        ...eventPayload,
        message_id: null,
      });

      await upsertUserViolation(supabaseService, user.id, moderationResult);

      const blockResponse: BlockResponse = {
        ok: false,
        decision: moderationResult.decision,
        user_facing_message: moderationResult.userFacingMessage,
        retry_allowed: moderationResult.retryAllowed,
        safe_reason_codes: moderationResult.safeReasonCodes,
      };

      return new Response(JSON.stringify(blockResponse), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: messageId, error: insertError } = await supabaseService.rpc(
      "insert_moderated_message",
      {
        _conversation_id: conversationId,
        _sender_id: user.id,
        _content: content || "(attachment)",
        _content_normalized: normalized || null,
        _attachments: attachments,
        _metadata: metadata,
      }
    );

    if (insertError) {
      console.error("insert_moderated_message error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    await supabaseService.from("message_moderation_events").insert({
      ...eventPayload,
      message_id: messageId,
    });

    if (moderationResult.decision === "flag") {
      await upsertUserViolation(supabaseService, user.id, moderationResult, 10);
    }

    const successResponse: SuccessResponse = {
      ok: true,
      decision: moderationResult.decision,
      message_id: String(messageId),
      user_facing_message: moderationResult.decision === "flag" ? moderationResult.userFacingMessage : undefined,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-and-send-message error:", e);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

async function upsertUserViolation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  result: ModerationResult,
  points = 25
) {
  const { data: existing } = await supabase
    .from("user_moderation_profile")
    .select("violation_points, warning_count, last_violation_at")
    .eq("user_id", userId)
    .single();

  const now = new Date().toISOString();
  const newPoints = (existing?.violation_points ?? 0) + points;
  const newWarnings = (existing?.warning_count ?? 0) + (result.decision === "block" ? 1 : 0);

  await supabase.from("user_moderation_profile").upsert(
    {
      user_id: userId,
      violation_points: newPoints,
      warning_count: newWarnings,
      last_violation_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
}
