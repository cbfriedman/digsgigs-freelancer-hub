-- Add award tracking fields to bids table
ALTER TABLE public.bids
  ADD COLUMN awarded BOOLEAN DEFAULT false,
  ADD COLUMN awarded_at TIMESTAMPTZ,
  ADD COLUMN awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN award_method TEXT CHECK (award_method IN ('consumer_hire', 'bid_acceptance', 'escrow_payment'));

-- Create indexes for award tracking on bids
CREATE INDEX idx_bids_awarded ON public.bids(awarded, awarded_at);
CREATE INDEX idx_bids_award_method ON public.bids(award_method) WHERE awarded = true;

-- Add award tracking fields to gigs table
ALTER TABLE public.gigs
  ADD COLUMN awarded_bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
  ADD COLUMN awarded_at TIMESTAMPTZ,
  ADD COLUMN awarded_digger_id UUID REFERENCES public.digger_profiles(id) ON DELETE SET NULL;

-- Create indexes for award tracking on gigs
CREATE INDEX idx_gigs_awarded ON public.gigs(awarded_at) WHERE awarded_at IS NOT NULL;
CREATE INDEX idx_gigs_awarded_digger ON public.gigs(awarded_digger_id) WHERE awarded_digger_id IS NOT NULL;
CREATE INDEX idx_gigs_awarded_bid ON public.gigs(awarded_bid_id) WHERE awarded_bid_id IS NOT NULL;