-- Fix any lead_purchases that still have the old $60 price (run after 20260230150000 or if that never ran).
-- Updates purchase_price and amount_paid to gig-based 8% ($3–$49) for rows where price is 60 (or 60.0).

WITH backfill AS (
  SELECT
    lp_inner.id AS lp_id,
    ROUND(
      LEAST(49, GREATEST(3,
        COALESCE(
          CASE
            WHEN g.calculated_price_cents IS NOT NULL AND g.calculated_price_cents > 0
            THEN (g.calculated_price_cents / 100.0)
            ELSE NULL
          END,
          ((COALESCE(g.budget_min, 0)::numeric + COALESCE(g.budget_max, 0)::numeric) / 2.0) * 0.08
        )
      ))::numeric,
      2
    ) AS calc_price
  FROM lead_purchases lp_inner
  JOIN gigs g ON g.id = lp_inner.gig_id
  WHERE lp_inner.purchase_price >= 59 AND lp_inner.purchase_price <= 61
)
UPDATE lead_purchases lp
SET
  purchase_price = backfill.calc_price,
  amount_paid = backfill.calc_price
FROM backfill
WHERE lp.id = backfill.lp_id;
