-- Add lead source and escrow fields to gigs table
ALTER TABLE public.gigs 
  ADD COLUMN lead_source TEXT CHECK (lead_source IN ('internet', 'telemarketing')),
  ADD COLUMN escrow_requested_by_consumer BOOLEAN DEFAULT false,
  ADD COLUMN telemarketer_id UUID REFERENCES public.telemarketer_profiles(id) ON DELETE SET NULL,
  ADD COLUMN uploaded_by_telemarketer BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_gigs_lead_source ON public.gigs(lead_source);
CREATE INDEX idx_gigs_telemarketer_id ON public.gigs(telemarketer_id);
CREATE INDEX idx_gigs_escrow_requested ON public.gigs(escrow_requested_by_consumer) WHERE escrow_requested_by_consumer = true;