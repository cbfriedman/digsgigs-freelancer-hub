-- Add 'pending_confirmation' status to gigs table
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_status_check;
ALTER TABLE public.gigs ADD CONSTRAINT gigs_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'pending_confirmation'));