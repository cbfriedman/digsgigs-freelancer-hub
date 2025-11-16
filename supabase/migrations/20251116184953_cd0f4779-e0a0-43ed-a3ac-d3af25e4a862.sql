-- Add digger response capability to ratings
ALTER TABLE public.ratings 
ADD COLUMN IF NOT EXISTS digger_response text,
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

-- Add RLS policy for diggers to respond to ratings
CREATE POLICY "Diggers can respond to their ratings"
ON public.ratings
FOR UPDATE
TO authenticated
USING (
  digger_id IN (
    SELECT id FROM public.digger_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  digger_id IN (
    SELECT id FROM public.digger_profiles
    WHERE user_id = auth.uid()
  )
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_ratings_digger_id ON public.ratings(digger_id);
CREATE INDEX IF NOT EXISTS idx_ratings_gig_id ON public.ratings(gig_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON public.ratings(created_at DESC);