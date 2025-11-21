-- Add confirmation tracking to gigs table
ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'verified')),
ADD COLUMN IF NOT EXISTS confirmation_method_preference text DEFAULT 'email' CHECK (confirmation_method_preference IN ('email', 'sms')),
ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS consumer_phone text,
ADD COLUMN IF NOT EXISTS is_confirmed_lead boolean DEFAULT false;

-- Create index for confirmation status queries
CREATE INDEX IF NOT EXISTS idx_gigs_confirmation_status ON public.gigs(confirmation_status);

-- Comment explaining the confirmation premium
COMMENT ON COLUMN public.gigs.is_confirmed_lead IS 'Confirmed leads are priced at 20% premium (rounded to nearest $0.50) for non-exclusive. All exclusive leads must be confirmed before posting.';