/**
 * Profanity detector with severity levels
 * Handles obfuscation: f*ck, f**k, f u c k, f-u-c-k
 */

import type { DetectorMatch, DetectorResult, ReasonCode, SeverityLevel } from "../types.ts";

interface ProfanityRule {
  base: string;
  severity: SeverityLevel;
  reasonCode: ReasonCode;
  score: number;
}

const PROFANITY_LIST: ProfanityRule[] = [
  { base: "fuck", severity: "high", reasonCode: "profanity_high", score: 60 },
  { base: "fucks", severity: "high", reasonCode: "profanity_high", score: 60 },
  { base: "fucking", severity: "high", reasonCode: "profanity_high", score: 65 },
  { base: "fucker", severity: "high", reasonCode: "profanity_high", score: 70 },
  { base: "fucked", severity: "high", reasonCode: "profanity_high", score: 65 },
  { base: "bullshit", severity: "medium", reasonCode: "profanity_medium", score: 45 },
  { base: "bitch", severity: "high", reasonCode: "profanity_high", score: 55 },
  { base: "bitches", severity: "high", reasonCode: "profanity_high", score: 55 },
  { base: "bastard", severity: "medium", reasonCode: "profanity_medium", score: 40 },
  { base: "asshole", severity: "high", reasonCode: "profanity_high", score: 55 },
  { base: "shit", severity: "medium", reasonCode: "profanity_medium", score: 35 },
  { base: "shitty", severity: "medium", reasonCode: "profanity_medium", score: 38 },
  { base: "dick", severity: "high", reasonCode: "profanity_high", score: 50 },
  { base: "dicks", severity: "high", reasonCode: "profanity_high", score: 50 },
  { base: "cunt", severity: "high", reasonCode: "profanity_high", score: 80 },
  { base: "whore", severity: "high", reasonCode: "profanity_high", score: 70 },
  { base: "slut", severity: "high", reasonCode: "profanity_high", score: 65 },
  { base: "damn", severity: "low", reasonCode: "profanity_low", score: 5 },
  { base: "crap", severity: "low", reasonCode: "profanity_low", score: 10 },
];

/** Build regex that matches base word with optional separators between letters */
function buildObfuscatedRegex(base: string): RegExp {
  const escaped = base.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\-_*.]*");
  return new RegExp("\\b" + escaped + "s?\\b", "gi");
}

/** Match f*ck, f**k, f*** */
function buildAsteriskRegex(base: string): RegExp {
  const first = base[0];
  const last = base.slice(-1);
  const middle = base.slice(1, -1).replace(/./g, ".*");
  return new RegExp("\\b" + first + middle + last + "s?\\b", "gi");
}

export function detectProfanity(normalized: string, aggressive: string): DetectorResult {
  const matches: DetectorMatch[] = [];
  const texts = [normalized, aggressive];

  for (const rule of PROFANITY_LIST) {
    const plainRegex = new RegExp("\\b" + rule.base + "s?\\b", "gi");
    const obfuscatedRegex = buildObfuscatedRegex(rule.base);
    const asteriskRegex = rule.base.length >= 3 ? buildAsteriskRegex(rule.base) : null;

    for (const text of texts) {
      const reList = [plainRegex, obfuscatedRegex];
      if (asteriskRegex) reList.push(asteriskRegex);
      for (const re of reList) {
        const m = text.match(re);
        if (m) {
          matches.push({
            ruleId: "profanity_" + rule.base,
            category: "profanity",
            snippet: "***",
            confidence: 0.95,
            severity: rule.severity,
            score: rule.score,
            reasonCode: rule.reasonCode,
          });
          break;
        }
      }
      if (matches.some((x) => x.ruleId === "profanity_" + rule.base)) break;
    }
  }

  const totalScore = matches.reduce((sum, m) => sum + m.score, 0);
  const maxSeverity = matches.reduce<SeverityLevel | null>((acc, m) => {
    const order = { low: 1, medium: 2, high: 3, critical: 4 };
    if (!acc) return m.severity;
    return order[m.severity] > order[acc] ? m.severity : acc;
  }, null);

  return {
    detector: "profanity",
    matches,
    totalScore,
    blocked: maxSeverity === "high" || maxSeverity === "critical" || totalScore >= 80,
  };
}
