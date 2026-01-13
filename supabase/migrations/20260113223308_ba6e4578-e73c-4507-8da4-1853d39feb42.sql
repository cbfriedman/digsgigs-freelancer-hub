-- Create lead_unlocks table to track which Diggers have unlocked which leads
CREATE TABLE IF NOT EXISTS public.lead_unlocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  price_paid_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  refunded boolean DEFAULT false,
  refunded_at timestamp with time zone,
  refund_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, digger_id)
);

-- Enable RLS on lead_unlocks
ALTER TABLE public.lead_unlocks ENABLE ROW LEVEL SECURITY;

-- Diggers can view their own unlocks
CREATE POLICY "Diggers can view their own unlocks"
  ON public.lead_unlocks
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all unlocks
CREATE POLICY "Admins can view all unlocks"
  ON public.lead_unlocks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update unlocks (for refunds)
CREATE POLICY "Admins can update unlocks"
  ON public.lead_unlocks
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add lead_notifications_enabled to email_preferences for email blast opt-out
ALTER TABLE public.email_preferences ADD COLUMN IF NOT EXISTS lead_notifications_enabled boolean DEFAULT true;

-- Allow public/anonymous users to insert gigs (giggers don't need accounts)
DROP POLICY IF EXISTS "Consumers can insert gigs" ON public.gigs;
CREATE POLICY "Anyone can insert gigs"
  ON public.gigs
  FOR INSERT
  WITH CHECK (true);

-- Make gigs publicly viewable (for lead display)
DROP POLICY IF EXISTS "Authenticated users can view gigs" ON public.gigs;
CREATE POLICY "Anyone can view gigs"
  ON public.gigs
  FOR SELECT
  USING (true);