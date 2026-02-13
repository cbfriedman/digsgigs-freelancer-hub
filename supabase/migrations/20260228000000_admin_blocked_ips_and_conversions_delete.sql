-- Block specific IPs from being recorded in campaign_conversions (admin-controlled).
-- log-campaign-event checks this table and skips insert when IP is blocked.
CREATE TABLE IF NOT EXISTS public.admin_blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_blocked_ips_ip ON public.admin_blocked_ips(ip_address);

ALTER TABLE public.admin_blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage blocked IPs" ON public.admin_blocked_ips;
CREATE POLICY "Admins can manage blocked IPs"
  ON public.admin_blocked_ips
  FOR ALL
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'::user_app_role));

COMMENT ON TABLE public.admin_blocked_ips IS 'IPs blocked from signup/funnel tracking; no events from these IPs are stored.';

-- Allow admins to delete campaign_conversions (for removing funnel events from Signup Analytics).
DROP POLICY IF EXISTS "Admins can delete all conversions" ON public.campaign_conversions;
CREATE POLICY "Admins can delete all conversions"
  ON public.campaign_conversions
  FOR DELETE
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));
