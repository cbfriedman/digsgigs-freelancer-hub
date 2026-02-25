-- Add actor_id to notification metadata so UI can show user avatars.
-- Update trigger: new bid -> actor = digger (user_id)
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
  digger_user_id uuid;
BEGIN
  SELECT g.consumer_id, g.title
  INTO gig_owner_id, gig_title
  FROM public.gigs g
  WHERE g.id = NEW.gig_id;

  SELECT dp.user_id, COALESCE(p.full_name, 'A digger')
  INTO digger_user_id, digger_name
  FROM public.digger_profiles dp
  JOIN public.profiles p ON dp.user_id = p.id
  WHERE dp.id = NEW.digger_id;

  PERFORM public.create_notification(
    gig_owner_id,
    'new_bid',
    'New Bid Received',
    digger_name || ' placed a bid of $' || NEW.amount || ' on "' || gig_title || '"',
    '/my-gigs',
    jsonb_build_object('bid_id', NEW.id, 'gig_id', NEW.gig_id, 'actor_id', digger_user_id)
  );

  RETURN NEW;
END;
$$;

-- Update trigger: new message -> actor = sender (keep admin conversation handling)
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

  IF conversation_data.admin_id IS NOT NULL THEN
    IF NEW.sender_id = conversation_data.admin_id THEN
      recipient_id := conversation_data.consumer_id;
    ELSE
      recipient_id := conversation_data.admin_id;
    END IF;
  ELSE
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
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id, 'actor_id', NEW.sender_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update trigger: bid status -> actor = gig owner (consumer who accepted/rejected)
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
  gig_consumer_id uuid;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT dp.user_id
  INTO digger_user_id
  FROM public.digger_profiles dp
  WHERE dp.id = NEW.digger_id;

  SELECT g.title, g.consumer_id
  INTO gig_title, gig_consumer_id
  FROM public.gigs g
  WHERE g.id = NEW.gig_id;

  CASE NEW.status
    WHEN 'accepted' THEN
      status_message := 'Your bid on "' || gig_title || '" was accepted!';
    WHEN 'rejected' THEN
      status_message := 'Your bid on "' || gig_title || '" was declined';
    ELSE
      status_message := 'Your bid status changed on "' || gig_title || '"';
  END CASE;

  PERFORM public.create_notification(
    digger_user_id,
    'bid_status',
    'Bid Status Update',
    status_message,
    '/my-bids',
    jsonb_build_object('bid_id', NEW.id, 'gig_id', NEW.gig_id, 'status', NEW.status, 'actor_id', gig_consumer_id)
  );

  RETURN NEW;
END;
$$;
