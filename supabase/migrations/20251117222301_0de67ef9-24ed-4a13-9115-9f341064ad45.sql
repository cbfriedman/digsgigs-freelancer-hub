-- Add digest preferences to email_preferences table
ALTER TABLE public.email_preferences 
ADD COLUMN digest_enabled boolean DEFAULT false,
ADD COLUMN digest_frequency text DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly'));

-- Create notification_digest_queue table to track notifications for batching
CREATE TABLE public.notification_digest_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_digest_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_digest_queue
CREATE POLICY "Users can view their own digest queue"
ON public.notification_digest_queue
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_digest_queue_user_sent ON public.notification_digest_queue(user_id, sent_at);
CREATE INDEX idx_digest_queue_created ON public.notification_digest_queue(created_at);

-- Function to add notifications to digest queue
CREATE OR REPLACE FUNCTION public.add_notification_to_digest_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_digest_enabled boolean;
BEGIN
  -- Check if user has digest enabled
  SELECT digest_enabled INTO user_digest_enabled
  FROM public.email_preferences
  WHERE user_id = NEW.user_id;
  
  -- If digest is enabled, add to queue
  IF user_digest_enabled THEN
    INSERT INTO public.notification_digest_queue (user_id, notification_id)
    VALUES (NEW.user_id, NEW.id)
    ON CONFLICT (notification_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically queue notifications for digest
CREATE TRIGGER queue_notification_for_digest
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.add_notification_to_digest_queue();