-- After a digger withdraws from a gig: they cannot bid again, chat, or edit for that gig.
-- Other diggers can still bid.

-- 1) Bids INSERT: block creating a new bid if this digger already has a withdrawn bid on this gig
DROP POLICY IF EXISTS "Only diggers can create bids" ON public.bids;

CREATE POLICY "Only diggers can create bids"
  ON public.bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_app_role(auth.uid(), 'digger')
    AND digger_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bids b
      WHERE b.gig_id = bids.gig_id
        AND b.digger_id = bids.digger_id
        AND (b.status = 'withdrawn' OR b.withdrawn_at IS NOT NULL)
    )
  );

COMMENT ON POLICY "Only diggers can create bids" ON public.bids IS
  'Diggers can create bids only for gigs where they do not already have a withdrawn bid.';

-- 2) can_access_conversation: deny digger access to a gig conversation if they have a withdrawn bid on that gig
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN digger_profiles dp ON c.digger_id = dp.id
    WHERE c.id = _conversation_id
    AND (
      (c.consumer_id = _user_id)
      OR (c.admin_id = _user_id)
      OR (c.consumer_id = _user_id AND c.admin_id IS NOT NULL)
      OR (
        dp.user_id = _user_id
        AND (
          c.gig_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM public.bids b
            WHERE b.gig_id = c.gig_id
              AND b.digger_id = c.digger_id
              AND (b.status = 'withdrawn' OR b.withdrawn_at IS NOT NULL)
          )
        )
      )
    )
  )
$$;

COMMENT ON FUNCTION public.can_access_conversation(uuid, uuid) IS
  'True if user is consumer, admin, or digger participant. Diggers who withdrew from the gig cannot access that gig conversation.';
