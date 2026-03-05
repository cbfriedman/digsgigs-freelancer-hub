-- Track when the gig owner (gigger) has visited the digger's full profile page.
-- Diggers see this on My Bids (profile icon: green when set, grey when not).

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS gigger_viewed_digger_profile_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bids.gigger_viewed_digger_profile_at IS
  'When the gig owner first visited this digger''s full profile page. Shown to diggers on My Bids (e.g. profile icon green when set, grey when not).';

-- RPC: record that the current user (gigger) viewed this digger's profile.
-- Updates all bids from this digger on any of the current user's gigs.
CREATE OR REPLACE FUNCTION public.record_gigger_viewed_digger_profile(_digger_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bids b
  SET gigger_viewed_digger_profile_at = COALESCE(b.gigger_viewed_digger_profile_at, now())
  WHERE b.digger_id = _digger_profile_id
    AND b.gig_id IN (SELECT id FROM public.gigs WHERE consumer_id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.record_gigger_viewed_digger_profile(uuid) IS
  'Records that the current user (gigger) viewed the given digger profile. Updates gigger_viewed_digger_profile_at on all bids from that digger on the gigger''s gigs.';

GRANT EXECUTE ON FUNCTION public.record_gigger_viewed_digger_profile(uuid) TO authenticated;
