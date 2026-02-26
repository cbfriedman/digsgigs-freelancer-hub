/**
 * Email detector - catches direct and obfuscated email addresses
 */

import type { DetectorMatch, DetectorResult, ReasonCode, SeverityLevel } from "../types.ts";

const EMAIL_REGEX = /[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/g;

/** Obfuscated: john at gmail dot com, user[at]outlook[dot]com */
const OBFUSCATED_EMAIL_REGEX = /[a-zA-Z0-9][a-zA-Z0-9._%+-]*\s*(?:\(at\)|\[at\]|{at}|@)\s*[a-zA-Z0-9][a-zA-Z0-9.-]*\s*(?:\(dot\)|\[dot\]|{dot}|\.)\s*[a-zA-Z]{2,}/gi;

/** Avoid matching example.com, support@platform.com if in allowlist - configurable */
const SKIP_DOMAINS = new Set([
  "example.com",
  "example.org",
  "test.com",
  "ourplatform.com",
  "digsgigs.com",
]);

function maskSnippet(s: string): string {
  if (s.length <= 8) return "***";
  return s.slice(0, 3) + "***" + s.slice(-2);
}

export function detectEmail(normalized: string, aggressive: string): DetectorResult {
  const matches: DetectorMatch[] = [];

  for (const re of [EMAIL_REGEX, OBFUSCATED_EMAIL_REGEX]) {
    const m = normalized.match(re) ?? aggressive.match(re);
    if (m) {
      for (const email of m) {
        const domain = email.split("@")[1]?.toLowerCase();
        if (domain && SKIP_DOMAINS.has(domain)) continue;
        matches.push({
          ruleId: "email_direct",
          category: "contact_email",
          snippet: maskSnippet(email),
          confidence: 1,
          severity: "critical",
          score: 100,
          reasonCode: "contact_email",
        });
      }
    }
  }

  return {
    detector: "email",
    matches,
    totalScore: matches.length > 0 ? 100 : 0,
    blocked: matches.length > 0,
  };
}
