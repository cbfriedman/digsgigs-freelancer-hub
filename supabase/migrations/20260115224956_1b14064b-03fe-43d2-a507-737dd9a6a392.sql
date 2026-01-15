-- Create pre_award_conversations table for anonymous messaging
CREATE TABLE public.pre_award_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gig_id, bid_id)
);

-- Create pre_award_messages table for storing messages
CREATE TABLE public.pre_award_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.pre_award_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('gigger', 'digger')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message_violations table for logging blocked messages
CREATE TABLE public.message_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.pre_award_conversations(id) ON DELETE SET NULL,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
  original_message TEXT NOT NULL,
  violations TEXT[] NOT NULL,
  violation_details JSONB,
  risk_score INTEGER,
  sender_type TEXT CHECK (sender_type IN ('gigger', 'digger')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pre_award_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_award_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_violations ENABLE ROW LEVEL SECURITY;

-- RLS for pre_award_conversations
CREATE POLICY "Users can view their own conversations" 
  ON public.pre_award_conversations FOR SELECT 
  USING (
    consumer_id = auth.uid() OR 
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Consumers can create conversations for their gigs" 
  ON public.pre_award_conversations FOR INSERT 
  WITH CHECK (
    consumer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.gigs WHERE id = gig_id AND consumer_id = auth.uid())
  );

-- RLS for pre_award_messages
CREATE POLICY "Conversation participants can view messages" 
  ON public.pre_award_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.pre_award_conversations c
      WHERE c.id = conversation_id
      AND (
        c.consumer_id = auth.uid() OR 
        c.digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Conversation participants can send messages" 
  ON public.pre_award_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pre_award_conversations c
      WHERE c.id = conversation_id
      AND (
        c.consumer_id = auth.uid() OR 
        c.digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
      )
    )
  );

-- RLS for message_violations - only admins can view
CREATE POLICY "Admins can view violations" 
  ON public.message_violations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles 
      WHERE user_id = auth.uid() 
      AND app_role = 'admin' 
      AND is_active = true
    )
  );

-- Allow system to insert violations (via service role)
CREATE POLICY "System can insert violations" 
  ON public.message_violations FOR INSERT 
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_pre_award_conversations_gig_id ON public.pre_award_conversations(gig_id);
CREATE INDEX idx_pre_award_conversations_bid_id ON public.pre_award_conversations(bid_id);
CREATE INDEX idx_pre_award_conversations_consumer_id ON public.pre_award_conversations(consumer_id);
CREATE INDEX idx_pre_award_conversations_digger_id ON public.pre_award_conversations(digger_id);
CREATE INDEX idx_pre_award_messages_conversation_id ON public.pre_award_messages(conversation_id);
CREATE INDEX idx_message_violations_user_id ON public.message_violations(user_id);
CREATE INDEX idx_message_violations_created_at ON public.message_violations(created_at DESC);

-- Trigger for updated_at on conversations
CREATE TRIGGER update_pre_award_conversations_updated_at
  BEFORE UPDATE ON public.pre_award_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();