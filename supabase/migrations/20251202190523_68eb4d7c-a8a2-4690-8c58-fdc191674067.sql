-- Add state and city columns to digger_profiles for enhanced location selection
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;