-- Identity fields on profiles for ID verification (admin-approved updates only).
-- Users request changes via profile_identity_update_requests; admin approves then data is applied here.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS zip_postal TEXT;

COMMENT ON COLUMN public.profiles.first_name IS 'Legal first name; used for ID verification. Updated only via admin-approved identity request.';
COMMENT ON COLUMN public.profiles.last_name IS 'Legal last name; used for ID verification. Updated only via admin-approved identity request.';
COMMENT ON COLUMN public.profiles.address IS 'Street address for ID verification. Updated only via admin-approved identity request.';
COMMENT ON COLUMN public.profiles.zip_postal IS 'ZIP/Postal code. Updated only via admin-approved identity request.';

-- User-initiated requests to update first name, last name, and location. Admin must approve before profiles are updated.
CREATE TABLE IF NOT EXISTS public.profile_identity_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  first_name TEXT,
  last_name TEXT,
  address TEXT,
  city TEXT,
  state_region TEXT,
  zip_postal TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_identity_update_requests_user_id ON public.profile_identity_update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_identity_update_requests_status ON public.profile_identity_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_identity_update_requests_created_at ON public.profile_identity_update_requests(created_at DESC);

ALTER TABLE public.profile_identity_update_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests only
CREATE POLICY "Users can view own identity update requests"
  ON public.profile_identity_update_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all identity update requests"
  ON public.profile_identity_update_requests FOR SELECT
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Admins can update (approve/reject)
CREATE POLICY "Admins can update identity update requests"
  ON public.profile_identity_update_requests FOR UPDATE
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Insert is done via edge function (service role) so we enforce one pending per user and validate input
COMMENT ON TABLE public.profile_identity_update_requests IS 'User requests to update first name, last name, and location for ID verification. Admin approval required before applying to profiles.';
