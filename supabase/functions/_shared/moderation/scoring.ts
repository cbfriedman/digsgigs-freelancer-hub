/**
 * Risk scoring and decision engine
 */

import type {
  ModerationDecision,
  ModerationResult,
  DetectorResult,
  DetectorMatch,
  ReasonCode,
  SeverityLevel,
} from "./types.ts";

const DEFAULT_THRESHOLD_BLOCK = 85;
const DEFAULT_THRESHOLD_FLAG = 40;
/** Reason codes that trigger auto-block when "contact" violation is strict (block_on_contact_keywords true) */
const CONTACT_STRICT_REASON_CODES: ReasonCode[] = [
  "contact_email",
  "contact_phone",
  "contact_social",
  "contact_whatsapp",
  "contact_telegram",
  "contact_wechat",
  "contact_skype",
  "contact_discord",
  "contact_instagram",
  "contact_facebook",
  "contact_keyword",
];
/** When block_on_contact_keywords is false, only these trigger auto-block (not generic "text me" / "call me") */
const CONTACT_ALWAYS_BLOCK_CODES: ReasonCode[] = [
  "contact_email",
  "contact_phone",
  "contact_social",
  "contact_whatsapp",
  "contact_telegram",
  "contact_wechat",
  "contact_skype",
  "contact_discord",
  "contact_instagram",
  "contact_facebook",
];
export interface ModerationScoringOptions {
  thresholdBlock?: number;
  thresholdFlag?: number;
  /** If false, "contact_keyword" (e.g. "text me", "call me") only adds to score and does not auto-block */
  blockOnContactKeywords?: boolean;
}

/** User-facing messages - do not expose internal logic */
const USER_MESSAGES: Record<string, string> = {
  contact: "Please remove contact details (email, phone, or social handles) and try again.",
  profanity: "Your message contains language that violates our community standards.",
  payment: "Off-platform payment requests are not allowed. Please use the platform for all transactions.",
  policy: "Your message violates marketplace policy.",
  generic: "Your message could not be sent. Please review our guidelines and try again.",
  flagged: "This message was flagged for review.",
};

export function computeModerationResult(
  detectorResults: DetectorResult[],
  userMuted: boolean,
  userBanned: boolean,
  options: ModerationScoringOptions = {}
): ModerationResult {
  const thresholdBlock = Math.min(99, Math.max(50, options.thresholdBlock ?? DEFAULT_THRESHOLD_BLOCK));
  const thresholdFlag = Math.min(80, Math.max(20, options.thresholdFlag ?? DEFAULT_THRESHOLD_FLAG));
  const blockOnContactKeywords = options.blockOnContactKeywords !== false;
  const contactReasonCodes =
    blockOnContactKeywords ? CONTACT_STRICT_REASON_CODES : CONTACT_ALWAYS_BLOCK_CODES;
  if (userBanned) {
    return {
      decision: "block",
      totalScore: 100,
      severity: "critical",
      reasons: ["user_banned"],
      matches: [],
      detectorResults: [],
      userFacingMessage: USER_MESSAGES.generic,
      retryAllowed: false,
      safeReasonCodes: ["account_restricted"],
    };
  }

  if (userMuted) {
    return {
      decision: "block",
      totalScore: 80,
      severity: "high",
      reasons: ["user_muted"],
      matches: [],
      detectorResults: [],
      userFacingMessage: "You are temporarily unable to send messages.",
      retryAllowed: false,
      safeReasonCodes: ["account_muted"],
    };
  }

  const allMatches: DetectorMatch[] = [];
  let totalScore = 0;
  const reasonSet = new Set<ReasonCode>();

  for (const dr of detectorResults) {
    allMatches.push(...dr.matches);
    totalScore += dr.totalScore;
    for (const m of dr.matches) {
      reasonSet.add(m.reasonCode);
    }
  }

  const hasContactViolation = [...reasonSet].some((r) => contactReasonCodes.includes(r));
  const hasPaymentViolation = detectorResults.some(
    (dr) => dr.detector === "off_platform_payment" && dr.matches.length > 0
  );
  const hasContactAndPayment = hasContactViolation && hasPaymentViolation;

  let decision: ModerationDecision = "allow";
  let severity: SeverityLevel | null = null;
  let userFacingMessage = USER_MESSAGES.generic;
  const safeReasonCodes: string[] = [];

  if (hasContactViolation) {
    decision = "block";
    severity = "critical";
    userFacingMessage = USER_MESSAGES.contact;
    safeReasonCodes.push("contact_info");
  } else if (hasContactAndPayment) {
    decision = "block";
    severity = "critical";
    userFacingMessage = USER_MESSAGES.payment;
    safeReasonCodes.push("contact_info", "payment_evasion");
  } else if (hasPaymentViolation && totalScore >= thresholdBlock) {
    decision = "block";
    severity = "high";
    userFacingMessage = USER_MESSAGES.payment;
    safeReasonCodes.push("payment_evasion");
  } else if (totalScore >= thresholdBlock) {
    decision = "block";
    severity = "high";
    if (reasonSet.has("profanity_high") || reasonSet.has("profanity_medium")) {
      userFacingMessage = USER_MESSAGES.profanity;
      safeReasonCodes.push("inappropriate_content");
    } else if (reasonSet.has("restricted_phrase")) {
      userFacingMessage = USER_MESSAGES.policy;
      safeReasonCodes.push("policy_violation");
    } else {
      userFacingMessage = USER_MESSAGES.generic;
      safeReasonCodes.push("policy_violation");
    }
  } else if (totalScore >= thresholdFlag) {
    decision = "flag";
    severity = "medium";
    userFacingMessage = USER_MESSAGES.flagged;
    safeReasonCodes.push("under_review");
  }

  return {
    decision,
    totalScore,
    severity,
    reasons: [...reasonSet],
    matches: allMatches,
    detectorResults,
    userFacingMessage,
    retryAllowed: decision === "allow" || decision === "flag",
    safeReasonCodes: safeReasonCodes.length > 0 ? safeReasonCodes : ["policy_violation"],
  };
}
