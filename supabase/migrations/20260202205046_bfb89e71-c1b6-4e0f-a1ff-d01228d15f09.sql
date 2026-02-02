-- Add region preference field to gigs table
-- Stores array of region codes that Giggers want their Diggers from
-- NULL means "All Regions" (no preference)

ALTER TABLE public.gigs 
ADD COLUMN IF NOT EXISTS preferred_regions TEXT[] DEFAULT NULL;

-- Add a comment explaining the valid values
COMMENT ON COLUMN public.gigs.preferred_regions IS 'Array of region codes: north_america, central_south_america, europe, africa, asia, middle_east, oceania. NULL means all regions.';
