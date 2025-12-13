-- Fix status check constraint to allow 'pending_confirmation' status
-- This migration ensures the constraint allows the status value used by the frontend

-- Drop existing constraint if it exists
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_status_check;

-- Recreate constraint with 'pending_confirmation' included
ALTER TABLE public.gigs ADD CONSTRAINT gigs_status_check 
  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'pending_confirmation'));

