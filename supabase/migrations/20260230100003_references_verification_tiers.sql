-- Hybrid verification tiers: platform (from completed gig), email (sent to reference), pending

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS verification_tier text
    CHECK (verification_tier IN ('platform', 'email', 'pending'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL;

-- Migrate existing is_verified=true to email tier (they used the link flow)
UPDATE public.references
SET verification_tier = 'email'
WHERE is_verified = true AND (verification_tier IS NULL OR verification_tier = 'pending');

-- Platform-verified: when gig_id is set, treat as platform tier
UPDATE public.references
SET verification_tier = 'platform', is_verified = true
WHERE gig_id IS NOT NULL;

COMMENT ON COLUMN public.references.verification_tier IS 'platform=from completed gig, email=verified via email link, pending=not verified';
COMMENT ON COLUMN public.references.gig_id IS 'When set, reference comes from a completed gig on the platform (platform-verified)';

CREATE INDEX IF NOT EXISTS idx_references_gig_id ON public.references(gig_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_references_platform_unique ON public.references(digger_id, gig_id) WHERE gig_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_references_verification_tier ON public.references(verification_tier);

-- Update references_public view to include verification_tier
DROP VIEW IF EXISTS public.references_public;
CREATE VIEW public.references_public WITH (security_invoker = true) AS
SELECT id, digger_id, reference_name, project_description, is_verified, verification_tier, gig_id, created_at
FROM public.references;

COMMENT ON VIEW public.references_public IS 'Safe reference fields for profile display; contact info excluded';

GRANT SELECT ON public.references_public TO anon;
GRANT SELECT ON public.references_public TO authenticated;

-- Giggers can insert platform-verified references for their completed gigs
CREATE POLICY "Giggers can insert platform references for completed gigs"
  ON public.references FOR INSERT
  TO authenticated
  WITH CHECK (
    gig_id IS NOT NULL
    AND verification_tier = 'platform'
    AND is_verified = true
    AND digger_id IN (
      SELECT g.awarded_digger_id FROM public.gigs g
      WHERE g.id = gig_id
        AND g.consumer_id = auth.uid()
        AND g.status = 'completed'
        AND g.awarded_digger_id IS NOT NULL
    )
  );
