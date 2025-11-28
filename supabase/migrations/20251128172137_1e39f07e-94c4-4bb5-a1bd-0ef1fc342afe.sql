-- Create lead_credits table to track pre-purchased lead allowances
CREATE TABLE IF NOT EXISTS public.lead_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digger_profile_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  industry TEXT,
  exclusivity_type TEXT NOT NULL DEFAULT 'non-exclusive',
  quantity_purchased INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  price_per_lead NUMERIC NOT NULL,
  total_paid NUMERIC NOT NULL,
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT valid_quantity CHECK (quantity_remaining >= 0 AND quantity_remaining <= quantity_purchased),
  CONSTRAINT valid_exclusivity CHECK (exclusivity_type IN ('non-exclusive', 'semi-exclusive', 'exclusive'))
);

-- Enable RLS
ALTER TABLE public.lead_credits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own lead credits
CREATE POLICY "Users can view their own lead credits"
  ON public.lead_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert lead credits (via service role)
CREATE POLICY "System can insert lead credits"
  ON public.lead_credits
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update lead credits (via service role)
CREATE POLICY "System can update lead credits"
  ON public.lead_credits
  FOR UPDATE
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_lead_credits_user_profile ON public.lead_credits(user_id, digger_profile_id);
CREATE INDEX idx_lead_credits_keyword ON public.lead_credits(keyword);
CREATE INDEX idx_lead_credits_remaining ON public.lead_credits(quantity_remaining) WHERE quantity_remaining > 0;