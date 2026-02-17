-- Public view: expose only safe columns so profile visitors (Giggers) can see references
-- Contact details (reference_email, reference_phone) stay private
CREATE OR REPLACE VIEW public.references_public AS
SELECT id, digger_id, reference_name, project_description, is_verified, created_at
FROM public.references;

COMMENT ON VIEW public.references_public IS 'Safe reference fields for profile display; contact info excluded';

GRANT SELECT ON public.references_public TO anon;
GRANT SELECT ON public.references_public TO authenticated;

-- Tokens for verification links: reference clicks link → we set is_verified = true
CREATE TABLE IF NOT EXISTS public.reference_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reference_verification_tokens_token ON public.reference_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reference_verification_tokens_reference_id ON public.reference_verification_tokens(reference_id);

ALTER TABLE public.reference_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only the digger who owns the reference can create a verification token
CREATE POLICY "Diggers can create verification tokens for own references"
  ON public.reference_verification_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    reference_id IN (
      SELECT r.id FROM public.references r
      JOIN public.digger_profiles dp ON dp.id = r.digger_id
      WHERE dp.user_id = auth.uid()
    )
  );

-- Allow read so owner can list/lookup; service role will validate token in edge function
CREATE POLICY "Diggers can view own verification tokens"
  ON public.reference_verification_tokens FOR SELECT
  TO authenticated
  USING (
    reference_id IN (
      SELECT r.id FROM public.references r
      JOIN public.digger_profiles dp ON dp.id = r.digger_id
      WHERE dp.user_id = auth.uid()
    )
  );
