/**
 * Minimal phone normalization for US-centric callback flows.
 * Accepts common user input formats and returns E.164 when possible.
 */
export function normalizeToE164US(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If user already provided a +, keep it but strip formatting.
  if (trimmed.startsWith("+")) {
    const digits = "+" + trimmed.slice(1).replace(/\D/g, "");
    // Very light validation: E.164 max 15 digits after +.
    const digitCount = digits.replace(/\D/g, "").length;
    if (digitCount < 10 || digitCount > 15) return null;
    return digits;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");

  // US 10-digit
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;

  // US 11-digit starting with 1
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) return `+${digitsOnly}`;

  // Unknown format
  return null;
}
