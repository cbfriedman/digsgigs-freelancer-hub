-- Allow Giggers to "bump" an open gig so it surfaces to the top of Browse Gigs.
-- Repost (clone) is handled in the app; bump uses this column for sorting.

ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS bumped_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.gigs.bumped_at IS 'Set when the gigger bumps the listing; used to sort open gigs (recently bumped first).';

CREATE INDEX IF NOT EXISTS idx_gigs_bumped_at ON public.gigs (bumped_at DESC NULLS LAST)
WHERE status = 'open';
