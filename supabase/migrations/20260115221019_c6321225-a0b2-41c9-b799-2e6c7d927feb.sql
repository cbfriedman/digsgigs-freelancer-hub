-- Add cost range columns to bids table for proposal templates
ALTER TABLE public.bids 
ADD COLUMN IF NOT EXISTS amount_min NUMERIC,
ADD COLUMN IF NOT EXISTS amount_max NUMERIC;

-- Update amount constraint to allow NULL if we have min/max range
COMMENT ON COLUMN public.bids.amount_min IS 'Minimum proposed cost (for range-based proposals)';
COMMENT ON COLUMN public.bids.amount_max IS 'Maximum proposed cost (for range-based proposals)';

-- The existing 'amount' column can serve as the midpoint or fixed price when min/max aren't used