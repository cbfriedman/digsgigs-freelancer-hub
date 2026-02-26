/**
 * Contact/social platform keyword detector
 * Catches "text me", "call me", "WhatsApp", "Telegram", etc.
 */

import type { DetectorMatch, DetectorResult, ReasonCode } from "../types.ts";

interface ContactRule {
  pattern: RegExp;
  reasonCode: ReasonCode;
  score: number;
  severity: "high" | "critical";
}

const CONTACT_RULES: ContactRule[] = [
  { pattern: /\b(whatsapp|whats\s*app|watsapp|wa\.me)\b/i, reasonCode: "contact_whatsapp", score: 90, severity: "critical" },
  { pattern: /\b(telegram|telegr[ae]m|t\.me)\b/i, reasonCode: "contact_telegram", score: 90, severity: "critical" },
  { pattern: /\b(wechat|we\s*chat|weixin)\b/i, reasonCode: "contact_wechat", score: 90, severity: "critical" },
  { pattern: /\b(skype)\b/i, reasonCode: "contact_skype", score: 85, severity: "critical" },
  { pattern: /\b(discord)\b/i, reasonCode: "contact_discord", score: 85, severity: "critical" },
  { pattern: /\b(instagram|insta\s*gram|insta:)\b/i, reasonCode: "contact_instagram", score: 85, severity: "critical" },
  { pattern: /\b(facebook|fb\.me|fb\.com)\b/i, reasonCode: "contact_facebook", score: 85, severity: "critical" },
  { pattern: /\b(text\s*me|text\s+me|txt\s*me)\b/i, reasonCode: "contact_keyword", score: 70, severity: "high" },
  { pattern: /\b(call\s*me|call\s+me|phone\s*me)\b/i, reasonCode: "contact_keyword", score: 70, severity: "high" },
  { pattern: /\b(email\s*me|email\s+me|mail\s*me)\b/i, reasonCode: "contact_keyword", score: 70, severity: "high" },
  { pattern: /\b(message\s*me\s+on|message\s+me\s+on|msg\s*me\s+on)\b/i, reasonCode: "contact_keyword", score: 80, severity: "critical" },
  { pattern: /\b(reach\s*me\s+on|reach\s+me\s+on|contact\s*me\s+on)\b/i, reasonCode: "contact_keyword", score: 75, severity: "high" },
  { pattern: /\b(my\s*number\s*is|my\s+number\s+is|number\s*is)\b/i, reasonCode: "contact_keyword", score: 80, severity: "critical" },
  { pattern: /\b(send\s*me\s+your\s*number|send\s+me\s+your\s+number)\b/i, reasonCode: "contact_keyword", score: 85, severity: "critical" },
  { pattern: /\b(@gmail\.com|@yahoo\.com|@outlook\.com|@hotmail\.com)\b/i, reasonCode: "contact_email", score: 95, severity: "critical" },
  { pattern: /\b(linkedin\.com\/in\/)\b/i, reasonCode: "contact_social", score: 70, severity: "high" },
];

export function detectContactKeywords(normalized: string, aggressive: string): DetectorResult {
  const matches: DetectorMatch[] = [];
  const texts = [normalized, aggressive];

  for (const rule of CONTACT_RULES) {
    for (const text of texts) {
      const m = text.match(rule.pattern);
      if (m) {
        matches.push({
          ruleId: rule.reasonCode,
          category: "contact_social",
          snippet: m[0].slice(0, 20) + (m[0].length > 20 ? "..." : ""),
          confidence: 0.9,
          severity: rule.severity,
          score: rule.score,
          reasonCode: rule.reasonCode,
        });
        break;
      }
    }
  }

  const totalScore = matches.length > 0
    ? Math.max(...matches.map((m) => m.score))
    : 0;

  return {
    detector: "contact_keywords",
    matches,
    totalScore,
    blocked: totalScore >= 85,
  };
}
