-- Certifications with uploadable evidence (PDF, images) for Giggers to verify
-- Diggers upload real certification proof; Giggers can view and trust

CREATE TABLE IF NOT EXISTS public.digger_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_profile_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  credential_id text,
  verification_url text,
  evidence_path text,
  issue_date date,
  expiry_date date,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digger_certifications IS 'Digger certifications with evidence (PDF, images). Giggers can view evidence to verify.';
COMMENT ON COLUMN public.digger_certifications.evidence_path IS 'Storage path for PDF or image evidence (bucket: certification-evidence)';
COMMENT ON COLUMN public.digger_certifications.credential_id IS 'Credential ID for online verification (e.g., AWS, Google Cloud)';
COMMENT ON COLUMN public.digger_certifications.verification_url IS 'URL to verify credential online';

CREATE INDEX IF NOT EXISTS idx_digger_certifications_profile ON public.digger_certifications(digger_profile_id);

ALTER TABLE public.digger_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view digger certifications"
  ON public.digger_certifications FOR SELECT
  USING (true);

CREATE POLICY "Diggers can manage own certifications"
  ON public.digger_certifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );

-- Storage bucket for certification evidence (PDF, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certification-evidence',
  'certification-evidence',
  true,
  10 * 1024 * 1024,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

CREATE POLICY "Anyone can view certification evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certification-evidence');

CREATE POLICY "Diggers can upload certification evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can update certification evidence"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'certification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can delete certification evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );
