-- Allow admin (and cascade) to delete gigs: escrow_contracts and related tables
-- currently block because they reference gigs(id) without ON DELETE.
-- 1) transactions: SET NULL when escrow_contract or milestone_payment is deleted (keep history)
-- 2) milestone_payments: CASCADE when escrow_contract is deleted
-- 3) escrow_contracts: CASCADE when gig is deleted
-- 4) gigger_deposits: CASCADE when gig is deleted (deposit records tied to gig)
-- 5) ai_callback_requests: SET NULL when gig is deleted (optional link)
-- 6) pending_penalty_payments: CASCADE when gig is deleted

-- transactions.escrow_contract_id
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_escrow_contract_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_escrow_contract_id_fkey
  FOREIGN KEY (escrow_contract_id) REFERENCES public.escrow_contracts(id) ON DELETE SET NULL;

-- transactions.milestone_payment_id
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_milestone_payment_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_milestone_payment_id_fkey
  FOREIGN KEY (milestone_payment_id) REFERENCES public.milestone_payments(id) ON DELETE SET NULL;

-- milestone_payments.escrow_contract_id
ALTER TABLE public.milestone_payments
  DROP CONSTRAINT IF EXISTS milestone_payments_escrow_contract_id_fkey;
ALTER TABLE public.milestone_payments
  ADD CONSTRAINT milestone_payments_escrow_contract_id_fkey
  FOREIGN KEY (escrow_contract_id) REFERENCES public.escrow_contracts(id) ON DELETE CASCADE;

-- escrow_contracts.gig_id (this was blocking admin bulk delete)
ALTER TABLE public.escrow_contracts
  DROP CONSTRAINT IF EXISTS escrow_contracts_gig_id_fkey;
ALTER TABLE public.escrow_contracts
  ADD CONSTRAINT escrow_contracts_gig_id_fkey
  FOREIGN KEY (gig_id) REFERENCES public.gigs(id) ON DELETE CASCADE;

-- gigger_deposits.gig_id
ALTER TABLE public.gigger_deposits
  DROP CONSTRAINT IF EXISTS gigger_deposits_gig_id_fkey;
ALTER TABLE public.gigger_deposits
  ADD CONSTRAINT gigger_deposits_gig_id_fkey
  FOREIGN KEY (gig_id) REFERENCES public.gigs(id) ON DELETE CASCADE;

-- ai_callback_requests.gig_id (nullable)
ALTER TABLE public.ai_callback_requests
  DROP CONSTRAINT IF EXISTS ai_callback_requests_gig_id_fkey;
ALTER TABLE public.ai_callback_requests
  ADD CONSTRAINT ai_callback_requests_gig_id_fkey
  FOREIGN KEY (gig_id) REFERENCES public.gigs(id) ON DELETE SET NULL;

-- pending_penalty_payments.gig_id
ALTER TABLE public.pending_penalty_payments
  DROP CONSTRAINT IF EXISTS pending_penalty_payments_gig_id_fkey;
ALTER TABLE public.pending_penalty_payments
  ADD CONSTRAINT pending_penalty_payments_gig_id_fkey
  FOREIGN KEY (gig_id) REFERENCES public.gigs(id) ON DELETE CASCADE;
