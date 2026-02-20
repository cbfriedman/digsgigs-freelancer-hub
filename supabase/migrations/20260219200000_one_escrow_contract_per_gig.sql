-- One gig = one active payment contract (first to create wins; principle 2).
-- Prevents duplicate active escrow contracts per gig.
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_contracts_one_active_per_gig
  ON public.escrow_contracts (gig_id)
  WHERE status = 'active';

COMMENT ON INDEX public.idx_escrow_contracts_one_active_per_gig IS
  'Ensures one active payment contract per gig; first to create wins.';
