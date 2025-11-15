-- Add RLS Policy for Consumers to View Lead Purchases for Their Gigs
-- This improves transparency and allows dispute resolution

CREATE POLICY "Consumers can view purchases for their gigs"
ON public.lead_purchases
FOR SELECT
USING (
  gig_id IN (
    SELECT id 
    FROM public.gigs 
    WHERE consumer_id = auth.uid()
  )
);