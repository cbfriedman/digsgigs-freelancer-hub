-- Add withdrawal tracking to bids table
ALTER TABLE public.bids
ADD COLUMN withdrawn_at timestamp with time zone,
ADD COLUMN withdrawal_penalty numeric;

-- Add 'withdrawn' status to bids
COMMENT ON COLUMN public.bids.status IS 'Status can be: pending, accepted, rejected, completed, withdrawn';

-- Create withdrawal_penalties table to track penalty transactions
CREATE TABLE public.withdrawal_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  digger_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  penalty_amount numeric NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.withdrawal_penalties ENABLE ROW LEVEL SECURITY;

-- Diggers can view their own penalties
CREATE POLICY "Diggers can view own penalties"
ON public.withdrawal_penalties
FOR SELECT
USING (
  digger_id IN (
    SELECT id FROM public.digger_profiles
    WHERE user_id = auth.uid()
  )
);

-- Diggers can insert their own penalties
CREATE POLICY "Diggers can create penalties"
ON public.withdrawal_penalties
FOR INSERT
WITH CHECK (
  digger_id IN (
    SELECT id FROM public.digger_profiles
    WHERE user_id = auth.uid()
  )
);

-- System can update penalty status
CREATE POLICY "System can update penalties"
ON public.withdrawal_penalties
FOR UPDATE
USING (true);

-- Add index for faster queries
CREATE INDEX idx_withdrawal_penalties_bid_id ON public.withdrawal_penalties(bid_id);
CREATE INDEX idx_withdrawal_penalties_digger_id ON public.withdrawal_penalties(digger_id);