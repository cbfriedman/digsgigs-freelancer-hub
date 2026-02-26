/**
 * Phone detector - catches phone numbers including obfuscated and spaced
 */

import type { DetectorMatch, DetectorResult } from "../types.ts";

/** E.164-ish: +1 202 555 0199, +44 20 7946 0958, (202) 555-0199 */
const PHONE_REGEX = /(?:\+\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g;

/** Spaced digits: 2 0 2 5 5 5 0 1 9 9 - 10+ digits with spaces */
const SPACED_DIGITS_REGEX = /(?:\d\s){9,}\d/g;

/** "two zero two five five five" - word digits (basic) */
const WORD_DIGITS = /\b(one|two|three|four|five|six|seven|eight|nine|zero|oh)\b/gi;

/** Avoid: 5000, 2024 (years), short number sequences that look like prices/years */
function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return false;
  if (digits.length > 15) return false;
  return true;
}

function maskPhone(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return d.slice(0, 2) + "***" + d.slice(-2);
}

export function detectPhone(normalized: string, aggressive: string): DetectorResult {
  const matches: DetectorMatch[] = [];

  const candidates: string[] = [];
  const m1 = normalized.match(PHONE_REGEX) ?? [];
  const m2 = aggressive.match(SPACED_DIGITS_REGEX) ?? [];
  candidates.push(...m1, ...m2);

  for (const c of candidates) {
    if (!looksLikePhone(c)) continue;
    matches.push({
      ruleId: "phone_direct",
      category: "contact_phone",
      snippet: maskPhone(c),
      confidence: 0.95,
      severity: "critical",
      score: 100,
      reasonCode: "contact_phone",
    });
  }

  return {
    detector: "phone",
    matches,
    totalScore: matches.length > 0 ? 100 : 0,
    blocked: matches.length > 0,
  };
}
