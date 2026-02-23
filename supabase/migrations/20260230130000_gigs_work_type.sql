-- Job/work type for gigs: remote, hybrid, onsite, flexible. Enables simple, gigger-friendly posting and filtering.
ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS work_type text DEFAULT 'remote'
CHECK (work_type IN ('remote', 'hybrid', 'onsite', 'flexible'));

COMMENT ON COLUMN public.gigs.work_type IS 'How work is done: remote, hybrid, onsite, or flexible. Shown to Diggers for matching.';
