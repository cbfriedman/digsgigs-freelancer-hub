-- Add columns for new simplified lead marketplace model
-- Add calculated_price_cents to gigs table for dynamic lead pricing
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS calculated_price_cents integer;

-- Add client_name to gigs table
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS client_name text;

-- Add requirements field for structured requirements
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS requirements text;