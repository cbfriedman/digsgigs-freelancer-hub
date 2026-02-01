-- Add new columns to bids table for milestones, payment methods, and payment terms
ALTER TABLE public.bids 
ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_terms text;

-- Create gigger_deposits table to track Gigger deposits on exclusive awards
CREATE TABLE IF NOT EXISTS public.gigger_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.gigs(id),
  bid_id UUID NOT NULL REFERENCES public.bids(id),
  gigger_id UUID NOT NULL,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id),
  deposit_amount_cents INTEGER NOT NULL,
  base_rate_amount_cents INTEGER NOT NULL,
  lead_cost_amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  released_to_digger_cents INTEGER,
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  acceptance_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gigger_deposits
ALTER TABLE public.gigger_deposits ENABLE ROW LEVEL SECURITY;

-- Giggers can view their own deposits
DROP POLICY IF EXISTS "Giggers can view their deposits" ON public.gigger_deposits;
CREATE POLICY "Giggers can view their deposits"
ON public.gigger_deposits
FOR SELECT
USING (gigger_id = auth.uid());

-- Diggers can view deposits on their awarded bids
DROP POLICY IF EXISTS "Diggers can view deposits on their bids" ON public.gigger_deposits;
CREATE POLICY "Diggers can view deposits on their bids"
ON public.gigger_deposits
FOR SELECT
USING (digger_id IN (SELECT id FROM digger_profiles WHERE user_id = auth.uid()));

-- Admins can view all deposits
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.gigger_deposits;
CREATE POLICY "Admins can view all deposits"
ON public.gigger_deposits
FOR SELECT
USING (EXISTS (SELECT 1 FROM user_app_roles WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true));

-- Service role can manage deposits
DROP POLICY IF EXISTS "Service role can manage deposits" ON public.gigger_deposits;
CREATE POLICY "Service role can manage deposits"
ON public.gigger_deposits
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gigger_deposits_gig_id ON public.gigger_deposits(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigger_deposits_status ON public.gigger_deposits(status);
CREATE INDEX IF NOT EXISTS idx_gigger_deposits_acceptance_deadline ON public.gigger_deposits(acceptance_deadline);