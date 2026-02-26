/**
 * Configurable restricted phrase detector
 * Can be extended with DB rules; for now uses built-in constants
 */

import type { DetectorMatch, DetectorResult } from "../types.ts";

/** Built-in restricted phrases - can be overridden by DB moderation_rules */
const BUILTIN_RESTRICTED: { pattern: RegExp; severity: "medium" | "high" | "critical"; score: number }[] = [
  { pattern: /\b(kill\s*yourself|kys)\b/i, severity: "critical", score: 100 },
  { pattern: /\b(rape|rapist)\b/i, severity: "critical", score: 100 },
  { pattern: /\b(terrorist|bomb\s*threat)\b/i, severity: "critical", score: 100 },
  { pattern: /\b(scam\s*you|steal\s*your)\b/i, severity: "high", score: 70 },
  { pattern: /\b(blackmail|extort)\b/i, severity: "critical", score: 95 },
];

export interface ModerationRuleRow {
  id: string;
  category: string;
  rule_name: string;
  pattern: string;
  severity: string;
  score: number;
  enabled: boolean;
}

export function detectRestrictedPhrases(
  normalized: string,
  aggressive: string,
  dbRules: ModerationRuleRow[] = []
): DetectorResult {
  const matches: DetectorMatch[] = [];

  const rules = [
    ...BUILTIN_RESTRICTED.map((r) => ({
      pattern: r.pattern,
      severity: r.severity as "medium" | "high" | "critical",
      score: r.score,
    })),
    ...dbRules
      .filter((r) => r.enabled && r.pattern)
      .map((r) => ({
        pattern: new RegExp(r.pattern, "gi"),
        severity: (r.severity || "medium") as "medium" | "high" | "critical",
        score: r.score || 50,
      })),
  ];

  const texts = [normalized, aggressive];

  for (const rule of rules) {
    for (const text of texts) {
      try {
        const m = text.match(rule.pattern);
        if (m) {
          matches.push({
            ruleId: "restricted",
            category: "restricted_phrase",
            snippet: "***",
            confidence: 0.95,
            severity: rule.severity,
            score: rule.score,
            reasonCode: "restricted_phrase",
          });
          break;
        }
      } catch {
        // invalid regex from DB
      }
    }
  }

  const totalScore = matches.reduce((sum, m) => sum + m.score, 0);

  return {
    detector: "restricted_phrases",
    matches,
    totalScore,
    blocked: matches.some((m) => m.severity === "critical" || m.score >= 90),
  };
}
