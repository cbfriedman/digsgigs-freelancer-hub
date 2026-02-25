-- Optional work log (hours, note, screenshot) when Digger submits a milestone. Helps trust and disputes.
ALTER TABLE public.milestone_payments
  ADD COLUMN IF NOT EXISTS work_log_hours numeric,
  ADD COLUMN IF NOT EXISTS work_log_note text,
  ADD COLUMN IF NOT EXISTS work_log_attachment_path text;

COMMENT ON COLUMN public.milestone_payments.work_log_hours IS 'Optional hours logged by Digger when submitting this milestone.';
COMMENT ON COLUMN public.milestone_payments.work_log_note IS 'Optional short note by Digger when submitting this milestone.';
COMMENT ON COLUMN public.milestone_payments.work_log_attachment_path IS 'Storage path (bucket milestone-work-log-attachments) for optional screenshot/attachment.';
