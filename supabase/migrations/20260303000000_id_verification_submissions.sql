-- ID verification submissions: user uploads ID docs + form; auto-approve if OCR text matches, else admin review.
-- On approval, profile and digger_profiles are synced so one user has one canonical address.

CREATE TABLE IF NOT EXISTS public.id_verification_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  apt TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States (US)',
  id_type TEXT NOT NULL CHECK (id_type IN ('drivers_license', 'passport', 'state_id', 'green_card', 'government_id')),
  front_file_path TEXT NOT NULL,
  back_file_path TEXT,
  extracted_text_front TEXT,
  extracted_text_back TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_id_verification_submissions_user_id ON public.id_verification_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_id_verification_submissions_status ON public.id_verification_submissions(status);
CREATE INDEX IF NOT EXISTS idx_id_verification_submissions_created_at ON public.id_verification_submissions(created_at DESC);

ALTER TABLE public.id_verification_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions only
CREATE POLICY "Users can view own id verification submissions"
  ON public.id_verification_submissions FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all id verification submissions"
  ON public.id_verification_submissions FOR SELECT
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Admins can update (approve/reject)
CREATE POLICY "Admins can update id verification submissions"
  ON public.id_verification_submissions FOR UPDATE
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Insert is done via edge function (service role)
COMMENT ON TABLE public.id_verification_submissions IS 'ID verification uploads. Auto-approved if extracted text matches form; else pending admin review. On approval, profile/digger_profiles are synced.';

-- Storage bucket for ID documents (private; only service role and owning user via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-verification',
  'id-verification',
  false,
  10 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Only service role can insert/update/delete (edge function uploads on behalf of user)
-- Allow authenticated users to read their own folder only (for viewing in admin or support)
CREATE POLICY "Users can read own id verification files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-verification'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role used by edge function for INSERT; no policy needed for anon/authenticated insert
-- Admins may need to read any file for review: use service role in edge or add policy
CREATE POLICY "Admins can read id verification files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'id-verification'
    AND public.has_app_role(auth.uid(), 'admin'::user_app_role)
  );
