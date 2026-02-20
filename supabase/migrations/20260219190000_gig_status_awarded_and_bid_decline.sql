-- Award flow: Gigger awards → gig status "awarded", bid marked awarded; Digger accepts or declines.
-- Add gig status 'awarded' (waiting for Digger to accept/decline).
-- Add optional decline reason on bids when Digger declines.

ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_status_check;
ALTER TABLE public.gigs ADD CONSTRAINT gigs_status_check
  CHECK (status IN ('open', 'awarded', 'in_progress', 'completed', 'cancelled', 'pending_confirmation', 'suspended'));

COMMENT ON CONSTRAINT gigs_status_check ON public.gigs IS 'awarded = Gigger awarded a bid, waiting for Digger to accept or decline.';

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS award_declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS award_decline_reason text;

COMMENT ON COLUMN public.bids.award_declined_at IS 'Set when Digger declines the award; award is then released.';
COMMENT ON COLUMN public.bids.award_decline_reason IS 'Optional short reason when Digger declines (e.g. Not available, Terms changed).';
