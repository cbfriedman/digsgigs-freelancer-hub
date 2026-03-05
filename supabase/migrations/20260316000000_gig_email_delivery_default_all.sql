-- Default new-gig email delivery to "all" so diggers receive mail when a gig is posted.
-- Admin can still set "manual" or "selected" via Admin > Support > Gig email delivery.
UPDATE public.gig_email_delivery_settings
SET mode = 'all', updated_at = now()
WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid;
