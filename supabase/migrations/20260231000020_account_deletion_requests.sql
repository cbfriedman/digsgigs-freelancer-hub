-- Account deletion requests: users request deletion, admins approve before account is removed
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_requested_at ON public.account_deletion_requests(requested_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own deletion requests"
  ON public.account_deletion_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests FOR SELECT
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Admins can update (approve/reject)
CREATE POLICY "Admins can update deletion requests"
  ON public.account_deletion_requests FOR UPDATE
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Insert is done via edge function (service role)
COMMENT ON TABLE public.account_deletion_requests IS 'User-initiated account deletion requests; admin approval required before deletion.';
