/**
 * Referral link and code helpers (testable).
 */

const REFERRAL_CODE_PREFIX = "digger-";

/**
 * Build the referral link for a digger to share.
 * Code format: digger-{first 8 chars of digger profile id}.
 */
export function buildReferralLink(origin: string, diggerProfileId: string): string {
  const code = buildReferralCode(diggerProfileId);
  return `${origin}/hire-a-pro?ref=${encodeURIComponent(code)}`;
}

/**
 * Build the referral code for a digger profile (e.g. "digger-a1b2c3d4").
 */
export function buildReferralCode(diggerProfileId: string): string {
  const segment = String(diggerProfileId).slice(0, 8);
  return REFERRAL_CODE_PREFIX + segment;
}

/**
 * Get referral code from sessionStorage (for attribution when posting a gig).
 */
export function getReferralCodeFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("referral_code");
}
