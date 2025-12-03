-- Create pending_lead_purchases table to store selections before checkout
CREATE TABLE public.pending_lead_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  digger_profile_id UUID REFERENCES public.digger_profiles(id),
  selections JSONB NOT NULL,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pending_lead_purchases ENABLE ROW LEVEL SECURITY;

-- Users can insert their own pending purchases
CREATE POLICY "Users can insert own pending purchases"
ON public.pending_lead_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own pending purchases
CREATE POLICY "Users can view own pending purchases"
ON public.pending_lead_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- System can update pending purchases (for webhook completion)
CREATE POLICY "System can update pending purchases"
ON public.pending_lead_purchases
FOR UPDATE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_pending_lead_purchases_stripe_session ON public.pending_lead_purchases(stripe_session_id);
CREATE INDEX idx_pending_lead_purchases_status ON public.pending_lead_purchases(status);