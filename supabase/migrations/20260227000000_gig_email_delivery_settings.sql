-- Admin sets default behavior for new project emails before a gigger posts.
-- One row: manual (admin sends from dashboard), all (auto to all diggers), or selected (auto to chosen diggers only).
CREATE TABLE IF NOT EXISTS public.gig_email_delivery_settings (
  id uuid PRIMARY KEY DEFAULT 'b0000000-0000-0000-0000-000000000001'::uuid,
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'all', 'selected')),
  selected_digger_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.gig_email_delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view gig_email_delivery_settings" ON public.gig_email_delivery_settings;
CREATE POLICY "Admins can view gig_email_delivery_settings"
  ON public.gig_email_delivery_settings FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

DROP POLICY IF EXISTS "Admins can update gig_email_delivery_settings" ON public.gig_email_delivery_settings;
CREATE POLICY "Admins can update gig_email_delivery_settings"
  ON public.gig_email_delivery_settings FOR UPDATE TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'::user_app_role));

INSERT INTO public.gig_email_delivery_settings (id, mode)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'manual')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.gig_email_delivery_settings IS 'Admin sets before gigger posts: manual (admin sends from dashboard), all (auto to all diggers), or selected (auto to chosen diggers only).';
