-- Add missing columns to existing digger_profiles table
ALTER TABLE public.digger_profiles 
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hourly_rate_min NUMERIC,
  ADD COLUMN IF NOT EXISTS hourly_rate_max NUMERIC,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add missing columns to existing gigs table
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS timeline TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_preferences TEXT;

-- Add missing column to ratings table
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL;

-- Update references table structure
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Set defaults for existing records
UPDATE public.digger_profiles SET business_name = profession WHERE business_name IS NULL;
UPDATE public.digger_profiles SET phone = 'Not provided' WHERE phone IS NULL;
UPDATE public.digger_profiles SET location = 'Not specified' WHERE location IS NULL;
UPDATE public.gigs SET location = 'Not specified' WHERE location IS NULL;
UPDATE public.gigs SET timeline = 'To be discussed' WHERE timeline IS NULL;

-- Make required fields NOT NULL
ALTER TABLE public.digger_profiles 
  ALTER COLUMN business_name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN location SET NOT NULL;

ALTER TABLE public.gigs ALTER COLUMN location SET NOT NULL;

-- Update lead_purchases structure
ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC,
  ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Set defaults for existing lead_purchases
UPDATE public.lead_purchases SET amount_paid = purchase_price WHERE amount_paid IS NULL;
UPDATE public.lead_purchases SET status = 'completed' WHERE status IS NULL;

-- Add status check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_purchases_status_check'
  ) THEN
    ALTER TABLE public.lead_purchases ADD CONSTRAINT lead_purchases_status_check CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;
END $$;

-- Make amount_paid required
ALTER TABLE public.lead_purchases ALTER COLUMN amount_paid SET NOT NULL;