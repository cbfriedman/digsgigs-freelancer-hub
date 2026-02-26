/**
 * Client-side pre-check for message moderation.
 * Minimal patterns for instant UX feedback only.
 * Final decision is ALWAYS server-side - this cannot be trusted.
 */

export interface ClientPreCheckResult {
  /** Likely violation - show warning before send */
  hasWarning: boolean;
  /** Generic warning message - do not expose specific patterns */
  warningMessage?: string;
}

/** Minimal obfuscation for client pre-check */
function simpleNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(at\)\s*/g, "@")
    .replace(/\s*\[at\]\s*/g, "@")
    .replace(/\s*\(dot\)\s*/g, ".")
    .replace(/\s*\[dot\]\s*/g, ".");
}

/** Basic patterns - kept minimal to avoid exposing detection logic */
const CLIENT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  emailObfuscated: /[a-zA-Z0-9]+\s*(?:\(at\)|\[at\])\s*[a-zA-Z0-9]+\s*(?:\(dot\)|\[dot\])\s*[a-zA-Z]{2,}/i,
  phone: /(?:\+\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/,
  whatsapp: /\b(whatsapp|whats\s*app|wa\.me)\b/i,
  telegram: /\b(telegram|t\.me)\b/i,
  textMe: /\b(text\s*me|call\s*me|email\s*me)\b/i,
  payOutside: /\b(pay\s*outside|wire\s*me|paypal\s*me|zelle|cash\s*app)\b/i,
};

export function clientPreCheck(content: string): ClientPreCheckResult {
  if (!content || typeof content !== "string") {
    return { hasWarning: false };
  }

  const normalized = simpleNormalize(content);

  if (CLIENT_PATTERNS.email.test(normalized) || CLIENT_PATTERNS.emailObfuscated.test(normalized)) {
    return {
      hasWarning: true,
      warningMessage: "Your message may contain contact details. Please remove and try again.",
    };
  }

  if (CLIENT_PATTERNS.phone.test(normalized)) {
    const digits = normalized.replace(/\D/g, "");
    if (digits.length >= 10) {
      return {
        hasWarning: true,
        warningMessage: "Your message may contain a phone number. Please remove and try again.",
      };
    }
  }

  if (
    CLIENT_PATTERNS.whatsapp.test(normalized) ||
    CLIENT_PATTERNS.telegram.test(normalized) ||
    CLIENT_PATTERNS.textMe.test(normalized)
  ) {
    return {
      hasWarning: true,
      warningMessage: "Your message may violate our contact policy. Please review and try again.",
    };
  }

  if (CLIENT_PATTERNS.payOutside.test(normalized)) {
    return {
      hasWarning: true,
      warningMessage: "Off-platform payment requests are not allowed.",
    };
  }

  return { hasWarning: false };
}
