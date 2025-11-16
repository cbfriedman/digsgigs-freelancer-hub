-- Add free estimate flag to digger profiles
ALTER TABLE public.digger_profiles
ADD COLUMN offers_free_estimates boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.digger_profiles.offers_free_estimates IS 'Whether the digger offers free estimates at $100 per lead';

-- Add index for faster filtering
CREATE INDEX idx_digger_profiles_free_estimates ON public.digger_profiles(offers_free_estimates) WHERE offers_free_estimates = true;