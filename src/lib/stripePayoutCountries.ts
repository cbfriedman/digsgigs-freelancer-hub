import { getCodeForCountryName } from "@/config/regionOptions";

/**
 * Stripe Connect Express accounts – countries where payouts are supported.
 * See https://stripe.com/global and Connect docs. Missing countries (e.g. ZA, ID) use alternative payouts.
 */
const STRIPE_PAYOUT_SUPPORTED_CODES = new Set([
  "AU", "AT", "BE", "BR", "BG", "CA", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HK", "HU", "IE", "IT", "JP",
  "LV", "LT", "LU", "MT", "MX", "NL", "NZ", "NO", "PL", "PT", "RO", "SG", "SK", "SI", "ES", "SE", "CH", "TH", "GB", "US",
  "AE", // UAE has restrictions but is in Stripe's list
]);

/**
 * Returns true if the given country (name or 2-letter code) is supported for Stripe Connect payouts.
 * Use this to show "Connect via Stripe" vs "Get paid via PayPal / Payoneer / Wise".
 */
export function isStripePayoutSupported(countryNameOrCode: string | null | undefined): boolean {
  if (countryNameOrCode == null || typeof countryNameOrCode !== "string") return false;
  const trimmed = countryNameOrCode.trim();
  if (!trimmed) return false;
  const code = trimmed.length === 2 ? trimmed.toUpperCase() : getCodeForCountryName(trimmed).toUpperCase();
  if (!code) return false;
  return STRIPE_PAYOUT_SUPPORTED_CODES.has(code);
}

export type AlternativePayoutProvider = "paypal" | "payoneer" | "wise";

export const ALTERNATIVE_PAYOUT_PROVIDERS: { value: AlternativePayoutProvider; label: string; description: string }[] = [
  { value: "paypal", label: "PayPal", description: "Receive payouts to your PayPal email" },
  { value: "payoneer", label: "Payoneer", description: "Receive payouts to your Payoneer account" },
  { value: "wise", label: "Wise", description: "Receive payouts to your Wise account" },
];
