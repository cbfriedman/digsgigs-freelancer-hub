/**
 * Message moderation types - shared between Edge Function and client
 */

export type ModerationDecision = "allow" | "flag" | "block" | "shadow_block";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export type ReasonCode =
  | "contact_email"
  | "contact_phone"
  | "contact_social"
  | "contact_whatsapp"
  | "contact_telegram"
  | "contact_wechat"
  | "contact_skype"
  | "contact_discord"
  | "contact_instagram"
  | "contact_facebook"
  | "contact_keyword"
  | "profanity_low"
  | "profanity_medium"
  | "profanity_high"
  | "off_platform_payment"
  | "restricted_phrase"
  | "user_muted"
  | "user_banned";

export interface DetectorMatch {
  ruleId: string;
  category: string;
  snippet: string;
  confidence: number;
  severity: SeverityLevel;
  score: number;
  reasonCode: ReasonCode;
}

export interface DetectorResult {
  detector: string;
  matches: DetectorMatch[];
  totalScore: number;
  blocked: boolean;
}

export interface NormalizedText {
  raw: string;
  normalized: string;
  aggressive: string;
}

export interface ModerationResult {
  decision: ModerationDecision;
  totalScore: number;
  severity: SeverityLevel | null;
  reasons: ReasonCode[];
  matches: DetectorMatch[];
  detectorResults: DetectorResult[];
  userFacingMessage: string;
  retryAllowed: boolean;
  safeReasonCodes: string[];
}
