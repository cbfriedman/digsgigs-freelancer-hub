-- Create lead exclusivity extensions table
CREATE TABLE public.lead_exclusivity_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID NOT NULL REFERENCES public.lead_exclusivity_queue(id) ON DELETE CASCADE,
  extension_number INTEGER NOT NULL,
  extension_hours INTEGER NOT NULL DEFAULT 24,
  extension_premium_percentage NUMERIC NOT NULL DEFAULT 33.0,
  extension_cost NUMERIC NOT NULL,
  stripe_payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(queue_entry_id, extension_number)
);

-- Create index for expiry lookups
CREATE INDEX idx_extensions_expiry ON public.lead_exclusivity_extensions(expires_at, payment_status);
CREATE INDEX idx_extensions_queue_entry ON public.lead_exclusivity_extensions(queue_entry_id);
CREATE INDEX idx_extensions_stripe_payment ON public.lead_exclusivity_extensions(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.lead_exclusivity_extensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Diggers can view own extensions"
  ON public.lead_exclusivity_extensions FOR SELECT
  USING (queue_entry_id IN (
    SELECT id FROM lead_exclusivity_queue 
    WHERE digger_id IN (SELECT id FROM digger_profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Consumers can view extensions for their gigs"
  ON public.lead_exclusivity_extensions FOR SELECT
  USING (queue_entry_id IN (
    SELECT leq.id FROM lead_exclusivity_queue leq
    JOIN gigs g ON leq.gig_id = g.id
    WHERE g.consumer_id = auth.uid()
  ));