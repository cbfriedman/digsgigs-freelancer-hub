-- Add status to contact_submissions: New / In progress / Resolved
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

-- Constrain to allowed values (existing rows get 'new' from default)
ALTER TABLE public.contact_submissions
  DROP CONSTRAINT IF EXISTS contact_submissions_status_check;
ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_status_check
  CHECK (status IN ('new', 'in_progress', 'resolved'));

COMMENT ON COLUMN public.contact_submissions.status IS 'Workflow: new, in_progress, resolved';

-- Allow admins to update (e.g. status)
CREATE POLICY "Admins can update contact_submissions"
  ON public.contact_submissions FOR UPDATE
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'));
