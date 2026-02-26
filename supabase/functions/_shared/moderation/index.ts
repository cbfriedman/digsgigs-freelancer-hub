/**
 * Message moderation engine - main entry
 */

import { normalizeText } from "./normalize.ts";
import { detectEmail } from "./detectors/email.ts";
import { detectPhone } from "./detectors/phone.ts";
import { detectContactKeywords } from "./detectors/contactKeywords.ts";
import { detectProfanity } from "./detectors/profanity.ts";
import { detectOffPlatformPayment } from "./detectors/offPlatformPayment.ts";
import { detectRestrictedPhrases, type ModerationRuleRow } from "./detectors/restrictedPhrases.ts";
import { computeModerationResult } from "./scoring.ts";
import type { ModerationResult, DetectorResult } from "./types.ts";

export type { ModerationResult, ModerationDecision, DetectorResult, NormalizedText, ReasonCode } from "./types.ts";
export { normalizeText } from "./normalize.ts";

export interface ModerationInput {
  content: string;
  dbRules?: ModerationRuleRow[];
}

export interface UserModerationState {
  muted: boolean;
  banned: boolean;
}

export function runModeration(
  input: ModerationInput,
  userState: UserModerationState = { muted: false, banned: false }
): ModerationResult {
  const { raw, normalized, aggressive } = normalizeText(input.content);

  const detectorResults: DetectorResult[] = [
    detectEmail(normalized, aggressive),
    detectPhone(normalized, aggressive),
    detectContactKeywords(normalized, aggressive),
    detectProfanity(normalized, aggressive),
    detectOffPlatformPayment(normalized, aggressive),
    detectRestrictedPhrases(normalized, aggressive, input.dbRules ?? []),
  ];

  return computeModerationResult(
    detectorResults,
    userState.muted,
    userState.banned
  );
}
