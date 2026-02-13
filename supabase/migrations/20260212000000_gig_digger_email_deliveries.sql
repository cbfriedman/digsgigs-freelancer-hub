-- Track which diggers received the "new gig" email per project (for admin control and visibility)
CREATE TABLE IF NOT EXISTS public.gig_digger_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by text NOT NULL DEFAULT 'auto' CHECK (sent_by IN ('auto', 'admin')),
  UNIQUE (gig_id, digger_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_digger_email_deliveries_gig_id ON public.gig_digger_email_deliveries(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_digger_email_deliveries_digger_id ON public.gig_digger_email_deliveries(digger_id);

ALTER TABLE public.gig_digger_email_deliveries ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write (via service role or RLS policy)
CREATE POLICY "Admins can manage gig_digger_email_deliveries"
  ON public.gig_digger_email_deliveries
  FOR ALL
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Allow service role / edge functions (no policy needed for service role; it bypasses RLS)
COMMENT ON TABLE public.gig_digger_email_deliveries IS 'Tracks which diggers received the new-gig email for each project; used by admin dashboard for send-to-selected or send-to-all.';
