-- Add lead_number column for human-readable lead identification
ALTER TABLE public.gigs 
ADD COLUMN IF NOT EXISTS lead_number TEXT;

-- Create sequence for lead numbering (starting from 1)
CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1 INCREMENT BY 1;

-- Create function to generate lead number in format: YYYY-MM-DD-00001
CREATE OR REPLACE FUNCTION public.assign_lead_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_number IS NULL THEN
    NEW.lead_number := TO_CHAR(NEW.created_at, 'YYYY-MM-DD') || '-' || LPAD(nextval('lead_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign lead number on insert
DROP TRIGGER IF EXISTS set_lead_number ON public.gigs;
CREATE TRIGGER set_lead_number
  BEFORE INSERT ON public.gigs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_lead_number();

-- Backfill existing gigs with lead numbers
UPDATE public.gigs 
SET lead_number = TO_CHAR(created_at, 'YYYY-MM-DD') || '-' || LPAD(id_seq::TEXT, 5, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as id_seq 
  FROM public.gigs 
  WHERE lead_number IS NULL
) AS numbered
WHERE gigs.id = numbered.id;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_gigs_lead_number ON public.gigs(lead_number);