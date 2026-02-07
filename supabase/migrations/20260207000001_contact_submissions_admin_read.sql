-- Allow admins to read contact form submissions (for admin inbox)
DROP POLICY IF EXISTS "Service role full access contact_submissions" ON public.contact_submissions;

CREATE POLICY "Service role full access contact_submissions"
  ON public.contact_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read contact_submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'));
