-- Allow admins to chat with any user via the Messages page.
-- Add admin_id to conversations: when set, this is an admin support conversation
-- (admin_id = admin user, consumer_id = the user being chatted with; gig_id and digger_id are null).

-- Add admin_id column to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_admin_id ON public.conversations(admin_id);

COMMENT ON COLUMN public.conversations.admin_id IS 'When set, this is an admin support conversation: admin chats with consumer_id user. gig_id and digger_id are null.';

-- Update can_access_conversation to include admin conversations
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN digger_profiles dp ON c.digger_id = dp.id
    WHERE c.id = _conversation_id
    AND (
      (c.consumer_id = _user_id OR dp.user_id = _user_id)
      OR (c.admin_id = _user_id)
      OR (c.consumer_id = _user_id AND c.admin_id IS NOT NULL)
    )
  )
$$;

-- Admins can create admin conversations (admin_id = self, consumer_id = target user)
DROP POLICY IF EXISTS "Consumers can create conversations" ON public.conversations;
CREATE POLICY "Consumers can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = consumer_id AND admin_id IS NULL);

DROP POLICY IF EXISTS "Diggers can create conversations" ON public.conversations;
CREATE POLICY "Diggers can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  AND admin_id IS NULL
);

CREATE POLICY "Admins can create admin conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  AND admin_id = auth.uid()
  AND consumer_id IS NOT NULL
  AND gig_id IS NULL
  AND digger_id IS NULL
);

-- Allow viewing messages in admin conversations
DROP POLICY IF EXISTS "Users can view messages in admin conversations" ON public.messages;
CREATE POLICY "Users can view messages in admin conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE admin_id = auth.uid() OR (consumer_id = auth.uid() AND admin_id IS NOT NULL)
  )
);

-- Allow sending messages in admin conversations (admin or the supported user)
DROP POLICY IF EXISTS "Users can send in admin conversations" ON public.messages;
CREATE POLICY "Users can send in admin conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT id FROM public.conversations
    WHERE admin_id = auth.uid() OR (consumer_id = auth.uid() AND admin_id IS NOT NULL)
  )
);

-- Update notify_message_recipient to handle admin conversations
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
  conversation_data record;
BEGIN
  SELECT c.consumer_id, c.digger_id, c.gig_id, c.admin_id
  INTO conversation_data
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  -- Admin support conversation: admin chats with consumer_id user
  IF conversation_data.admin_id IS NOT NULL THEN
    IF NEW.sender_id = conversation_data.admin_id THEN
      recipient_id := conversation_data.consumer_id;
    ELSE
      recipient_id := conversation_data.admin_id;
    END IF;
  ELSE
    -- Normal gig conversation: consumer and digger
    IF NEW.sender_id = conversation_data.consumer_id THEN
      SELECT dp.user_id INTO recipient_id
      FROM public.digger_profiles dp
      WHERE dp.id = conversation_data.digger_id;
    ELSE
      recipient_id := conversation_data.consumer_id;
    END IF;
  END IF;

  SELECT COALESCE(p.full_name, 'Someone')
  INTO sender_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  IF recipient_id IS NOT NULL THEN
    PERFORM public.create_notification(
      recipient_id,
      'new_message',
      'New Message',
      sender_name || ' sent you a message',
      '/messages',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;
