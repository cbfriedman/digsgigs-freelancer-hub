-- Add refund_percentage column to lead_issues table
ALTER TABLE public.lead_issues
ADD COLUMN refund_percentage integer DEFAULT 0 CHECK (refund_percentage >= 0 AND refund_percentage <= 100);

COMMENT ON COLUMN public.lead_issues.refund_percentage IS 'Percentage of refund to be issued (0-100)';