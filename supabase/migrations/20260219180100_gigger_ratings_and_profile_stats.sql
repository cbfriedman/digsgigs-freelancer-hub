-- Digger→Gigger reviews: one per gig, only when contract fully completed.
-- Enables "Diggers can rate Giggers" and reflects on Gigger profile.

CREATE TABLE IF NOT EXISTS public.gigger_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  gigger_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(digger_id, gig_id)
);

COMMENT ON TABLE public.gigger_ratings IS 'Digger rates Gigger (client) per completed gig. One row per (digger_id, gig_id).';

CREATE INDEX IF NOT EXISTS idx_gigger_ratings_consumer_id ON public.gigger_ratings(consumer_id);
CREATE INDEX IF NOT EXISTS idx_gigger_ratings_digger_id ON public.gigger_ratings(digger_id);
CREATE INDEX IF NOT EXISTS idx_gigger_ratings_gig_id ON public.gigger_ratings(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigger_ratings_created_at ON public.gigger_ratings(created_at DESC);

ALTER TABLE public.gigger_ratings ENABLE ROW LEVEL SECURITY;

-- Diggers can insert when they are the digger and contract is fully completed
CREATE POLICY "Diggers can create gigger ratings when contract fully completed"
  ON public.gigger_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
    AND public.is_contract_fully_completed(gig_id, digger_id)
    AND EXISTS (
      SELECT 1 FROM public.gigs g
      WHERE g.id = gig_id AND g.consumer_id = consumer_id
    )
  );

-- Anyone can read (for profile display; mutual reveal can be enforced in app)
CREATE POLICY "Anyone can view gigger ratings"
  ON public.gigger_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Gigger (consumer) can update only gigger_response and responded_at (enforced by trigger)
CREATE POLICY "Giggers can update own gigger ratings for response"
  ON public.gigger_ratings FOR UPDATE
  TO authenticated
  USING (consumer_id = auth.uid())
  WITH CHECK (consumer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.gigger_ratings_response_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consumer_id = auth.uid() THEN
    -- Gigger is updating: only gigger_response and responded_at may change
    IF OLD.rating IS DISTINCT FROM NEW.rating OR OLD.review_text IS DISTINCT FROM NEW.review_text
       OR OLD.digger_id IS DISTINCT FROM NEW.digger_id OR OLD.gig_id IS DISTINCT FROM NEW.gig_id THEN
      RAISE EXCEPTION 'Giggers cannot edit rating or review content; they can only respond.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gigger_ratings_response_only_trigger ON public.gigger_ratings;
CREATE TRIGGER gigger_ratings_response_only_trigger
  BEFORE UPDATE ON public.gigger_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.gigger_ratings_response_only();

-- Add cached stats to gigger_profiles for "reviews from Diggers"
ALTER TABLE public.gigger_profiles
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;

COMMENT ON COLUMN public.gigger_profiles.average_rating IS 'Average of ratings received from Diggers (gigger_ratings).';
COMMENT ON COLUMN public.gigger_profiles.total_ratings IS 'Count of ratings received from Diggers (gigger_ratings).';

CREATE OR REPLACE FUNCTION public.update_gigger_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumer_id uuid;
BEGIN
  v_consumer_id := COALESCE(NEW.consumer_id, OLD.consumer_id);
  UPDATE public.gigger_profiles
  SET
    average_rating = (
      SELECT ROUND(AVG(gr.rating)::numeric, 2)
      FROM public.gigger_ratings gr
      WHERE gr.consumer_id = v_consumer_id
    ),
    total_ratings = (
      SELECT COUNT(*)::integer
      FROM public.gigger_ratings gr
      WHERE gr.consumer_id = v_consumer_id
    )
  WHERE user_id = v_consumer_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_gigger_rating_stats_trigger ON public.gigger_ratings;
CREATE TRIGGER update_gigger_rating_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gigger_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gigger_rating_stats();

-- Backfill gigger_profiles that have no row (ratings will create need for display only)
-- No insert needed; existing gigger_profiles get columns with default 0.
