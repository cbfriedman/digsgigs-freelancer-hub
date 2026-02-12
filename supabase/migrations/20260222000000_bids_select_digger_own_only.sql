-- Ensure diggers can only see their own bids; gig owners see all bids on their gigs.
-- Replaces the two existing SELECT policies with one explicit policy.

DROP POLICY IF EXISTS "Diggers can view own bids" ON public.bids;
DROP POLICY IF EXISTS "Gig owners can view bids on their gigs" ON public.bids;

-- Single SELECT policy: row visible only if current user is the gig owner OR the digger who placed the bid.
-- Admins can see all bids for support.
CREATE POLICY "Bids visible to gig owner or own digger only"
  ON public.bids
  FOR SELECT
  TO authenticated
  USING (
    (gig_id IN (SELECT id FROM public.gigs WHERE consumer_id = auth.uid()))
    OR (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()))
    OR (public.is_admin(auth.uid()))
  );

COMMENT ON POLICY "Bids visible to gig owner or own digger only" ON public.bids IS
  'Gig owners see all bids on their gigs. Diggers see only their own bids. Admins see all. Ensures diggers cannot see other diggers'' bids.';
