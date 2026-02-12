-- Let giggers specify skills required so Diggers can match and tailor proposals.
ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS skills_required text[] DEFAULT NULL;

COMMENT ON COLUMN public.gigs.skills_required IS
  'Skills or expertise the gigger wants (e.g. React, Logo design, SEO). Optional; helps Diggers tailor bids.';
