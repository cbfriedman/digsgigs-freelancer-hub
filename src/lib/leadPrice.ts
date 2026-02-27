/**
 * Single source of truth for non-exclusive lead unlock price across the site.
 *
 * Non-Exclusive formula: Lead Price = higher of [ (Budget Avg × 3%) ] or [ $20 ],
 * rounded to the nearest dollar, $69 maximum.
 * When the gig has calculated_price_cents set (e.g. from post-gig), that value is used (clamped to $20–$69).
 */

export const LEAD_PRICE_RATE = 0.03;
export const LEAD_PRICE_MIN_DOLLARS = 20;
export const LEAD_PRICE_MAX_DOLLARS = 69;
export const LEAD_PRICE_MIN_CENTS = LEAD_PRICE_MIN_DOLLARS * 100;
export const LEAD_PRICE_MAX_CENTS = LEAD_PRICE_MAX_DOLLARS * 100;

/** Human-readable caption shown next to lead price (e.g. in GigDetail sidebar). */
export const LEAD_PRICE_CAPTION = "3% of budget avg or $20, whichever is higher · Rounded to nearest dollar · $69 max.";

/**
 * Compute lead price in dollars from budget (or use stored calculated_price_cents when provided).
 * Formula: max(round(budgetAvg × 3%), $20), capped at $69.
 * Returns a number in [LEAD_PRICE_MIN_DOLLARS, LEAD_PRICE_MAX_DOLLARS].
 */
export function getLeadPriceDollars(
  budgetMin?: number | null,
  budgetMax?: number | null,
  calculatedPriceCents?: number | null
): number {
  if (calculatedPriceCents != null && calculatedPriceCents > 0) {
    const dollars = calculatedPriceCents / 100;
    return Math.min(LEAD_PRICE_MAX_DOLLARS, Math.max(LEAD_PRICE_MIN_DOLLARS, Math.round(dollars)));
  }
  const min = budgetMin ?? 0;
  const max = budgetMax ?? min;
  const avg = (min + max) / 2;
  if (avg <= 0) return LEAD_PRICE_MIN_DOLLARS;
  const fromRate = Math.round(avg * LEAD_PRICE_RATE);
  const price = Math.max(fromRate, LEAD_PRICE_MIN_DOLLARS);
  return Math.min(LEAD_PRICE_MAX_DOLLARS, price);
}

/**
 * Same logic in cents (for backend/Stripe). Use this in edge functions so charge matches frontend.
 */
export function getLeadPriceCents(
  budgetMin?: number | null,
  budgetMax?: number | null,
  calculatedPriceCents?: number | null
): number {
  if (calculatedPriceCents != null && calculatedPriceCents > 0) {
    return Math.min(LEAD_PRICE_MAX_CENTS, Math.max(LEAD_PRICE_MIN_CENTS, Math.round(calculatedPriceCents / 100) * 100));
  }
  const dollars = getLeadPriceDollars(budgetMin, budgetMax, null);
  return Math.round(dollars * 100);
}

/**
 * For UI: dollar amount and optional short label (e.g. "Lead price: $25" or "Lead price: $20–$69" when no budget).
 */
export function getLeadPriceDisplay(
  budgetMin?: number | null,
  budgetMax?: number | null,
  calculatedPriceCents?: number | null
): { dollars: number; label: string; rangeLabel: string } {
  const dollars = getLeadPriceDollars(budgetMin, budgetMax, calculatedPriceCents);
  const hasBudget = (budgetMin != null && budgetMin > 0) || (budgetMax != null && budgetMax > 0);
  return {
    dollars,
    label: hasBudget ? `Lead price: $${dollars}` : "Lead price: $20–$69",
    rangeLabel: "$20–$69",
  };
}
