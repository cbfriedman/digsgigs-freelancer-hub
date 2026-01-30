-- Add columns to track lead blast status
ALTER TABLE public.gigs 
ADD COLUMN IF NOT EXISTS pro_blast_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS non_pro_blast_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_gigs_blast_status 
ON public.gigs (pro_blast_sent_at, non_pro_blast_sent_at) 
WHERE pro_blast_sent_at IS NOT NULL AND non_pro_blast_sent_at IS NULL;

COMMENT ON COLUMN public.gigs.pro_blast_sent_at IS 'Timestamp when lead was blasted to Pro diggers (immediate)';
COMMENT ON COLUMN public.gigs.non_pro_blast_sent_at IS 'Timestamp when lead was blasted to non-Pro diggers (2hr delay)';