-- Add columns to bids table to support success-based pricing
ALTER TABLE public.bids 
ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'pay_per_lead',
ADD COLUMN IF NOT EXISTS referral_fee_rate numeric DEFAULT 0.02,
ADD COLUMN IF NOT EXISTS referral_fee_cap_cents integer DEFAULT 24900,
ADD COLUMN IF NOT EXISTS referral_fee_charged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS referral_fee_cents integer;

-- Add constraint to validate pricing_model values
ALTER TABLE public.bids 
ADD CONSTRAINT bids_pricing_model_check 
CHECK (pricing_model IN ('pay_per_lead', 'success_based'));

-- Create referral_payments table to track all referral fee payments
CREATE TABLE IF NOT EXISTS public.referral_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  fee_rate numeric NOT NULL DEFAULT 0.02,
  fee_cap_cents integer,
  bid_amount numeric NOT NULL,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  charged_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  refunded_at timestamp with time zone,
  refund_reason text
);

-- Add constraint for status
ALTER TABLE public.referral_payments 
ADD CONSTRAINT referral_payments_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

-- Enable RLS
ALTER TABLE public.referral_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_payments
CREATE POLICY "Diggers can view their own referral payments" 
ON public.referral_payments 
FOR SELECT 
USING (digger_id IN (
  SELECT id FROM public.digger_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Gig owners can view referral payments for their gigs" 
ON public.referral_payments 
FOR SELECT 
USING (gig_id IN (
  SELECT id FROM public.gigs 
  WHERE consumer_id = auth.uid()
));

CREATE POLICY "Admins can view all referral payments" 
ON public.referral_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_app_roles 
  WHERE user_id = auth.uid() 
  AND app_role = 'admin' 
  AND is_active = true
));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_payments_bid_id ON public.referral_payments(bid_id);
CREATE INDEX IF NOT EXISTS idx_referral_payments_digger_id ON public.referral_payments(digger_id);
CREATE INDEX IF NOT EXISTS idx_referral_payments_gig_id ON public.referral_payments(gig_id);
CREATE INDEX IF NOT EXISTS idx_referral_payments_status ON public.referral_payments(status);
CREATE INDEX IF NOT EXISTS idx_bids_pricing_model ON public.bids(pricing_model);