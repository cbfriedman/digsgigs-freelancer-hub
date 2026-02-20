-- Admin: view all transactions and escrow-related data for support and dispute resolution.
-- Disputes table so consumers/diggers can raise issues and admins can resolve them.

-- 1) Admins can SELECT all transactions (read-only for oversight)
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- 2) Admins can SELECT all escrow_contracts and milestone_payments
CREATE POLICY "Admins can view all escrow contracts"
  ON public.escrow_contracts FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

CREATE POLICY "Admins can view all milestone payments"
  ON public.milestone_payments FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- 3) Disputes table: one row per dispute (gig/contract/transaction/milestone)
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  escrow_contract_id uuid REFERENCES public.escrow_contracts(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  milestone_payment_id uuid REFERENCES public.milestone_payments(id) ON DELETE SET NULL,
  raised_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved')),
  resolution_type text
    CHECK (resolution_type IS NULL OR resolution_type IN (
      'refund_consumer', 'release_to_digger', 'partial_refund', 'closed_no_action'
    )),
  admin_notes text,
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.disputes IS 'Payment/gig disputes; admins resolve via admin-resolve-dispute edge function.';
COMMENT ON COLUMN public.disputes.resolution_type IS 'Set when status=resolved: refund_consumer, release_to_digger, partial_refund, closed_no_action.';

CREATE INDEX IF NOT EXISTS idx_disputes_gig_id ON public.disputes(gig_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON public.disputes(raised_by_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_escrow_contract_id ON public.disputes(escrow_contract_id);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Participants (consumer or digger on the gig/contract) can view disputes for their gig/contract and create disputes
CREATE POLICY "Users can view disputes for their gig or contract"
  ON public.disputes FOR SELECT TO authenticated
  USING (
    -- gig owner (consumer)
    gig_id IN (SELECT id FROM public.gigs WHERE consumer_id = auth.uid())
    OR
    -- digger on the gig (via contract or gig's awarded digger)
    (
      escrow_contract_id IN (
        SELECT id FROM public.escrow_contracts WHERE digger_id IN (
          SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
        )
      )
      OR
      gig_id IN (
        SELECT gig_id FROM public.bids
        WHERE digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create disputes for their gig or contract"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    raised_by_user_id = auth.uid()
    AND (
      gig_id IN (SELECT id FROM public.gigs WHERE consumer_id = auth.uid())
      OR gig_id IN (
        SELECT g.id FROM public.gigs g
        INNER JOIN public.bids b ON b.gig_id = g.id
        WHERE b.digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
      )
      OR escrow_contract_id IN (
        SELECT id FROM public.escrow_contracts
        WHERE consumer_id = auth.uid()
           OR digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Only admins can update disputes (add notes, set in_review, resolve)
CREATE POLICY "Admins can update disputes"
  ON public.disputes FOR UPDATE TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Trigger to keep updated_at
CREATE OR REPLACE FUNCTION public.set_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS disputes_updated_at ON public.disputes;
CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_disputes_updated_at();
