-- Poster (gigger) business location / country so diggers can see where the client is based.
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS poster_country text DEFAULT NULL;

COMMENT ON COLUMN public.gigs.poster_country IS 'Gigger/poster business country (e.g. United States). Shown to diggers; distinct from work location (Remote/on-site).';
