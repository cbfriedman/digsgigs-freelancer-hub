-- Add industry column to cold_email_leads table
ALTER TABLE public.cold_email_leads 
ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'general';

-- Add index for efficient filtering by industry
CREATE INDEX IF NOT EXISTS idx_cold_email_leads_industry ON public.cold_email_leads(industry);

-- Update existing records to have 'general' industry
UPDATE public.cold_email_leads SET industry = 'general' WHERE industry IS NULL;