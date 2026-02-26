/**
 * Off-platform payment / policy evasion detector
 */

import type { DetectorMatch, DetectorResult } from "../types.ts";

interface PaymentRule {
  pattern: RegExp;
  score: number;
}

const PAYMENT_RULES: PaymentRule[] = [
  { pattern: /\b(pay\s*outside\s*platform|pay\s+outside)\b/i, score: 95 },
  { pattern: /\b(avoid\s*fees|bypass\s*fees|skip\s*fees)\b/i, score: 90 },
  { pattern: /\b(let'?s\s*do\s*this\s*outside|do\s*it\s*outside)\b/i, score: 85 },
  { pattern: /\b(send\s*direct\s*payment|direct\s*payment)\b/i, score: 95 },
  { pattern: /\b(wire\s*me|wire\s+me|wire\s*transfer)\b/i, score: 90 },
  { pattern: /\b(paypal\s*me|pay\s*me\s*on\s*paypal)\b/i, score: 90 },
  { pattern: /\b(crypto\s*only|cryptocurrency\s*only|pay\s*in\s*crypto)\b/i, score: 85 },
  { pattern: /\b(zelle\s*me|zelle\s+me|send\s*via\s*zelle)\b/i, score: 90 },
  { pattern: /\b(cash\s*app\s*me|cashapp\s*me|venmo\s*me)\b/i, score: 90 },
  { pattern: /\b(send\s*me\s*your\s*number|give\s*me\s*your\s*number)\b/i, score: 85 },
  { pattern: /\b(off\s*platform|outside\s*the\s*platform)\b/i, score: 75 },
  { pattern: /\b(contact\s*me\s*directly|reach\s*out\s*directly)\b/i, score: 60 },
];

export function detectOffPlatformPayment(normalized: string, aggressive: string): DetectorResult {
  const matches: DetectorMatch[] = [];
  const texts = [normalized, aggressive];

  for (const rule of PAYMENT_RULES) {
    for (const text of texts) {
      const m = text.match(rule.pattern);
      if (m) {
        matches.push({
          ruleId: "payment_evasion",
          category: "off_platform_payment",
          snippet: "***",
          confidence: 0.9,
          severity: "high",
          score: rule.score,
          reasonCode: "off_platform_payment",
        });
        break;
      }
    }
  }

  const totalScore = matches.reduce((sum, m) => sum + m.score, 0);

  return {
    detector: "off_platform_payment",
    matches,
    totalScore,
    blocked: totalScore >= 85 || matches.some((m) => m.score >= 90),
  };
}
