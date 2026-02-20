-- Allow transaction rows for milestone payments when no bid exists (e.g. direct escrow)
ALTER TABLE public.transactions
ALTER COLUMN bid_id DROP NOT NULL;

COMMENT ON COLUMN public.transactions.bid_id IS 'Optional: set when payment is tied to an accepted bid; null for escrow-only milestone payments.';
