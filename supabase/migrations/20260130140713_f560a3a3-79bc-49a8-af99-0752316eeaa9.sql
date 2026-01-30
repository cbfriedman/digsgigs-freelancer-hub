-- Create a table to track pending penalty payments
CREATE TABLE IF NOT EXISTS public.pending_penalty_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id),
  deposit_id UUID NOT NULL REFERENCES public.gigger_deposits(id),
  gig_id UUID NOT NULL REFERENCES public.gigs(id),
  bid_id UUID NOT NULL REFERENCES public.bids(id),
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'non_acceptance_penalty',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, waived, disputed
  collection_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_penalty_payments ENABLE ROW LEVEL SECURITY;

-- Admins can see all pending payments
CREATE POLICY "Admins can view all pending payments"
  ON public.pending_penalty_payments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Diggers can see their own pending payments
CREATE POLICY "Diggers can view own pending payments"
  ON public.pending_penalty_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = pending_penalty_payments.digger_id
        AND dp.user_id = auth.uid()
    )
  );

-- Add a column to digger_profiles to flag accounts with outstanding penalties
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS has_outstanding_penalty BOOLEAN DEFAULT false;

-- Create trigger to update updated_at
CREATE TRIGGER update_pending_penalty_payments_updated_at
  BEFORE UPDATE ON public.pending_penalty_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();