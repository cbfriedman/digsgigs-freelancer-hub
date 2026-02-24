-- PEWC consent_records table for Get free quote (store-pewc-consent).
-- Standalone migration so the table exists even if the original telemarketing migration failed.

CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  phone_hash TEXT GENERATED ALWAYS AS (encode(sha256(phone::bytea), 'hex')) STORED,
  email TEXT,
  full_name TEXT,
  property_address TEXT,

  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',

  ip_address TEXT NOT NULL,
  user_agent TEXT,
  page_url TEXT NOT NULL,
  sms_verified BOOLEAN DEFAULT false,
  sms_verified_at TIMESTAMP WITH TIME ZONE,
  sms_verification_code TEXT,

  consent_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_method TEXT,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  raw_data_source TEXT,

  telemarketer_id UUID,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Policies: allow service role / backend to insert/update; admins can view (using has_app_role).
DROP POLICY IF EXISTS "System can insert consent records" ON public.consent_records;
CREATE POLICY "System can insert consent records"
  ON public.consent_records FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update consent records" ON public.consent_records;
CREATE POLICY "System can update consent records"
  ON public.consent_records FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admins can view all consent records" ON public.consent_records;
CREATE POLICY "Admins can view all consent records"
  ON public.consent_records FOR SELECT
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

-- Telemarketers policy only if telemarketer_profiles exists (optional).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'telemarketer_profiles') THEN
    DROP POLICY IF EXISTS "Telemarketers can view assigned consent records" ON public.consent_records;
    CREATE POLICY "Telemarketers can view assigned consent records"
      ON public.consent_records FOR SELECT
      USING (
        telemarketer_id IN (
          SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consent_records_phone_hash ON public.consent_records(phone_hash);
CREATE INDEX IF NOT EXISTS idx_consent_records_revoked ON public.consent_records(consent_revoked);

DROP TRIGGER IF EXISTS update_consent_records_updated_at ON public.consent_records;
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.consent_records IS 'PEWC consent records for Get free quote; used by store-pewc-consent and verify-phone-sms.';
