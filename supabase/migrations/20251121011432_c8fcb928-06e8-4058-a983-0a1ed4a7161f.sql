-- Create lead exclusivity queue table
CREATE TABLE public.lead_exclusivity_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  queue_position INTEGER NOT NULL,
  base_price NUMERIC NOT NULL,
  lead_source TEXT NOT NULL CHECK (lead_source IN ('internet', 'telemarketing')),
  exclusivity_starts_at TIMESTAMPTZ,
  exclusivity_ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'expired', 'awarded', 'converted_to_nonexclusive')),
  awarded_at TIMESTAMPTZ,
  converted_to_nonexclusive_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gig_id, digger_id),
  UNIQUE(gig_id, queue_position)
);

-- Create indexes for queue queries
CREATE INDEX idx_lead_queue_gig_status ON public.lead_exclusivity_queue(gig_id, status);
CREATE INDEX idx_lead_queue_digger_status ON public.lead_exclusivity_queue(digger_id, status);
CREATE INDEX idx_lead_queue_position ON public.lead_exclusivity_queue(gig_id, queue_position);
CREATE INDEX idx_lead_queue_expiry ON public.lead_exclusivity_queue(exclusivity_ends_at) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.lead_exclusivity_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Diggers can view own queue entries"
  ON public.lead_exclusivity_queue FOR SELECT
  USING (digger_id IN (
    SELECT id FROM digger_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Consumers can view queue for their gigs"
  ON public.lead_exclusivity_queue FOR SELECT
  USING (gig_id IN (
    SELECT id FROM gigs WHERE consumer_id = auth.uid()
  ));

-- Add updated_at trigger
CREATE TRIGGER update_lead_exclusivity_queue_updated_at
  BEFORE UPDATE ON public.lead_exclusivity_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();