-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Create index for better query performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger function for new bid notifications
CREATE OR REPLACE FUNCTION public.notify_gig_owner_of_new_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gig_owner_id uuid;
  gig_title text;
  digger_name text;
BEGIN
  -- Get gig owner and title
  SELECT g.consumer_id, g.title
  INTO gig_owner_id, gig_title
  FROM public.gigs g
  WHERE g.id = NEW.gig_id;
  
  -- Get digger name
  SELECT COALESCE(p.full_name, 'A digger')
  INTO digger_name
  FROM public.digger_profiles dp
  JOIN public.profiles p ON dp.user_id = p.id
  WHERE dp.id = NEW.digger_id;
  
  -- Create notification
  PERFORM public.create_notification(
    gig_owner_id,
    'new_bid',
    'New Bid Received',
    digger_name || ' placed a bid of $' || NEW.amount || ' on "' || gig_title || '"',
    '/my-gigs',
    jsonb_build_object('bid_id', NEW.id, 'gig_id', NEW.gig_id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new bids
CREATE TRIGGER notify_new_bid
AFTER INSERT ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.notify_gig_owner_of_new_bid();

-- Trigger function for new message notifications
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
  -- Get conversation details
  SELECT c.consumer_id, c.digger_id, c.gig_id
  INTO conversation_data
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- Determine recipient (the person who didn't send the message)
  IF NEW.sender_id = conversation_data.consumer_id THEN
    -- Message from consumer to digger
    SELECT dp.user_id INTO recipient_id
    FROM public.digger_profiles dp
    WHERE dp.id = conversation_data.digger_id;
  ELSE
    -- Message from digger to consumer
    recipient_id := conversation_data.consumer_id;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(p.full_name, 'Someone')
  INTO sender_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;
  
  -- Create notification
  PERFORM public.create_notification(
    recipient_id,
    'new_message',
    'New Message',
    sender_name || ' sent you a message',
    '/messages',
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new messages
CREATE TRIGGER notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_recipient();

-- Trigger function for bid status changes
CREATE OR REPLACE FUNCTION public.notify_bid_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digger_user_id uuid;
  gig_title text;
  status_message text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get digger user_id
  SELECT dp.user_id
  INTO digger_user_id
  FROM public.digger_profiles dp
  WHERE dp.id = NEW.digger_id;
  
  -- Get gig title
  SELECT g.title
  INTO gig_title
  FROM public.gigs g
  WHERE g.id = NEW.gig_id;
  
  -- Set message based on status
  CASE NEW.status
    WHEN 'accepted' THEN
      status_message := 'Your bid on "' || gig_title || '" was accepted!';
    WHEN 'rejected' THEN
      status_message := 'Your bid on "' || gig_title || '" was declined';
    ELSE
      status_message := 'Your bid status changed on "' || gig_title || '"';
  END CASE;
  
  -- Create notification
  PERFORM public.create_notification(
    digger_user_id,
    'bid_status',
    'Bid Status Update',
    status_message,
    '/my-bids',
    jsonb_build_object('bid_id', NEW.id, 'gig_id', NEW.gig_id, 'status', NEW.status)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for bid status changes
CREATE TRIGGER notify_bid_status_update
AFTER UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.notify_bid_status_change();

-- Trigger function for new gigs matching digger categories
CREATE OR REPLACE FUNCTION public.notify_matching_diggers_of_new_gig()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digger_record record;
BEGIN
  -- Only notify for new gigs with a category
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find diggers with matching categories
  FOR digger_record IN
    SELECT DISTINCT dp.user_id
    FROM public.digger_profiles dp
    JOIN public.digger_categories dc ON dc.digger_id = dp.id
    WHERE dc.category_id = NEW.category_id
  LOOP
    -- Create notification for each matching digger
    PERFORM public.create_notification(
      digger_record.user_id,
      'new_gig',
      'New Gig Available',
      'A new gig matching your skills: "' || NEW.title || '"',
      '/browse-gigs',
      jsonb_build_object('gig_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger for new gigs
CREATE TRIGGER notify_matching_diggers
AFTER INSERT ON public.gigs
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_diggers_of_new_gig();