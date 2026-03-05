-- Track when the gig owner (gigger) has viewed/reviewed each bid so diggers can see it on My Bids.
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS viewed_by_gigger_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bids.viewed_by_gigger_at IS 'When the gig owner first viewed this bid on the gig detail page. Shown to diggers on My Bids (e.g. eye icon green when set, grey when not).';
