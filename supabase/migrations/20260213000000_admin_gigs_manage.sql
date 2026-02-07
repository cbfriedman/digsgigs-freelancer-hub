-- Allow status 'suspended' for admin suspension
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_status_check;
ALTER TABLE public.gigs ADD CONSTRAINT gigs_status_check
  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'pending_confirmation', 'suspended'));

-- Admins can update any gig (suspend, change status, modify fields)
CREATE POLICY "Admins can update gigs"
  ON public.gigs FOR UPDATE
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'));

-- Admins can delete any gig (remove)
CREATE POLICY "Admins can delete gigs"
  ON public.gigs FOR DELETE
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'));

COMMENT ON CONSTRAINT gigs_status_check ON public.gigs IS 'Includes suspended for admin use.';
