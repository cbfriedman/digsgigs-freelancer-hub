-- Add exclusive tracking fields to lead_purchases table
ALTER TABLE public.lead_purchases
  ADD COLUMN is_exclusive BOOLEAN DEFAULT false,
  ADD COLUMN base_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN lead_source TEXT CHECK (lead_source IN ('internet', 'telemarketing')),
  ADD COLUMN exclusivity_queue_position INTEGER,
  ADD COLUMN awarded_at TIMESTAMPTZ,
  ADD COLUMN award_expires_at TIMESTAMPTZ,
  ADD COLUMN award_extended BOOLEAN DEFAULT false,
  ADD COLUMN converted_from_exclusive BOOLEAN DEFAULT false,
  ADD COLUMN telemarketer_id UUID REFERENCES public.telemarketer_profiles(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_lead_purchases_exclusivity ON public.lead_purchases(is_exclusive, awarded_at);
CREATE INDEX idx_lead_purchases_award_expiry ON public.lead_purchases(award_expires_at) WHERE awarded_at IS NOT NULL;
CREATE INDEX idx_lead_purchases_telemarketer ON public.lead_purchases(telemarketer_id) WHERE telemarketer_id IS NOT NULL;
CREATE INDEX idx_lead_purchases_lead_source ON public.lead_purchases(lead_source);
CREATE INDEX idx_lead_purchases_converted ON public.lead_purchases(converted_from_exclusive) WHERE converted_from_exclusive = true;