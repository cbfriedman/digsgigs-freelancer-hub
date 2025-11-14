-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = consumer_id OR 
  digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Consumers can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "Diggers can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (
  auth.uid() = consumer_id OR 
  digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE consumer_id = auth.uid() OR 
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE consumer_id = auth.uid() OR 
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (sender_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_conversations_consumer ON public.conversations(consumer_id);
CREATE INDEX idx_conversations_digger ON public.conversations(digger_id);
CREATE INDEX idx_conversations_gig ON public.conversations(gig_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Trigger to update conversations timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();