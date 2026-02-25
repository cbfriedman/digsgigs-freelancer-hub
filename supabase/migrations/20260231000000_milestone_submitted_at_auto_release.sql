-- submitted_at: when the Digger submitted the milestone (for 14-day auto-release)
ALTER TABLE public.milestone_payments
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

COMMENT ON COLUMN public.milestone_payments.submitted_at IS 'When status was set to submitted; used for auto-release after 14 days if Gigger does not approve or dispute.';

-- Backfill: existing submitted rows get submitted_at = updated_at or created_at (so they become eligible after 14 days from that time)
UPDATE public.milestone_payments
SET submitted_at = COALESCE(created_at, now() - interval '14 days')
WHERE status = 'submitted' AND submitted_at IS NULL;

-- Index for cron query: find submitted milestones older than 14 days
CREATE INDEX IF NOT EXISTS idx_milestone_payments_submitted_auto_release
  ON public.milestone_payments (submitted_at)
  WHERE status = 'submitted';
