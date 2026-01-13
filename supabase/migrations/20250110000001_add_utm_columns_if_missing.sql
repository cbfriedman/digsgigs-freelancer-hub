-- Add UTM tracking columns if table exists but columns are missing
-- This is a safe migration that won't fail if columns already exist

-- Check if table exists and add UTM columns if missing
DO $$
BEGIN
  -- Add utm_source if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN utm_source TEXT;
  END IF;

  -- Add utm_medium if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN utm_medium TEXT;
  END IF;

  -- Add utm_campaign if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN utm_campaign TEXT;
  END IF;

  -- Add utm_content if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'utm_content'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN utm_content TEXT;
  END IF;

  -- Add utm_term if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'utm_term'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN utm_term TEXT;
  END IF;

  -- Add referrer if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'referrer'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN referrer TEXT;
  END IF;

  -- Add landing_page if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'landing_page'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN landing_page TEXT;
  END IF;

  -- Add device_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'device_type'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN device_type TEXT;
  END IF;

  -- Add browser if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'early_access_applications' 
      AND column_name = 'browser'
  ) THEN
    ALTER TABLE public.early_access_applications ADD COLUMN browser TEXT;
  END IF;
END $$;

-- Create indexes for UTM tracking (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_early_access_applications_utm_source 
  ON public.early_access_applications(utm_source);

CREATE INDEX IF NOT EXISTS idx_early_access_applications_utm_campaign 
  ON public.early_access_applications(utm_campaign);

CREATE INDEX IF NOT EXISTS idx_early_access_applications_utm_medium 
  ON public.early_access_applications(utm_medium);
