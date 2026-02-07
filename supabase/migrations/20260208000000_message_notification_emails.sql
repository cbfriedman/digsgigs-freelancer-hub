-- Throttle table: when we last sent a "new message" email to a recipient for a conversation.
-- Used so we don't flood inbox (e.g. max one email per conversation per 4 hours per recipient).
CREATE TABLE IF NOT EXISTS public.message_notification_emails (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, recipient_user_id)
);

-- Only the Edge Function (service role) writes; no RLS needed for app users.
ALTER TABLE public.message_notification_emails ENABLE ROW LEVEL SECURITY;

-- No policies: only service role can read/write. App never touches this table directly.
COMMENT ON TABLE public.message_notification_emails IS
  'Tracks last time we sent an email notification for a new message to a recipient; used to throttle (e.g. once per 4 hours per conversation).';
