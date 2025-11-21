-- Create telemarketer_commissions table
CREATE TABLE public.telemarketer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telemarketer_id UUID NOT NULL REFERENCES public.telemarketer_profiles(id) ON DELETE CASCADE,
  lead_purchase_id UUID NOT NULL REFERENCES public.lead_purchases(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'flat_fee')),
  lead_price NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  commission_percentage NUMERIC,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  awarded_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_commission_per_lead UNIQUE (lead_purchase_id, telemarketer_id)
);

-- Create indexes for performance
CREATE INDEX idx_telemarketer_commissions_telemarketer_id ON public.telemarketer_commissions(telemarketer_id);
CREATE INDEX idx_telemarketer_commissions_payment_status ON public.telemarketer_commissions(payment_status);
CREATE INDEX idx_telemarketer_commissions_awarded_at ON public.telemarketer_commissions(awarded_at);
CREATE INDEX idx_telemarketer_commissions_lead_purchase ON public.telemarketer_commissions(lead_purchase_id);

-- Enable RLS
ALTER TABLE public.telemarketer_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Telemarketers can view their own commissions
CREATE POLICY "Telemarketers can view own commissions"
  ON public.telemarketer_commissions
  FOR SELECT
  USING (
    telemarketer_id IN (
      SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies: Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON public.telemarketer_commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );