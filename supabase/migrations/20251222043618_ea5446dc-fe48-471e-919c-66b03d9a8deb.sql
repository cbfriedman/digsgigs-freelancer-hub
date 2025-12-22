-- Create cold_email_leads table to store cold contacts
CREATE TABLE public.cold_email_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('gigger', 'digger')),
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'unsubscribed', 'converted', 'bounced')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Create cold_email_sequence table to track email sequence progress
CREATE TABLE public.cold_email_sequence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.cold_email_leads(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  step_1_sent_at TIMESTAMP WITH TIME ZONE,
  step_2_sent_at TIMESTAMP WITH TIME ZONE,
  step_3_sent_at TIMESTAMP WITH TIME ZONE,
  step_4_sent_at TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.cold_email_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_sequence ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin-only access (using user_type column)
CREATE POLICY "Admins can manage cold_email_leads"
ON public.cold_email_leads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "Admins can manage cold_email_sequence"
ON public.cold_email_sequence
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_cold_email_leads_status ON public.cold_email_leads(status);
CREATE INDEX idx_cold_email_leads_type ON public.cold_email_leads(lead_type);
CREATE INDEX idx_cold_email_leads_email ON public.cold_email_leads(email);
CREATE INDEX idx_cold_email_sequence_next_send ON public.cold_email_sequence(next_send_at);
CREATE INDEX idx_cold_email_sequence_current_step ON public.cold_email_sequence(current_step);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_cold_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cold_email_leads_updated_at
BEFORE UPDATE ON public.cold_email_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_cold_email_updated_at();

CREATE TRIGGER update_cold_email_sequence_updated_at
BEFORE UPDATE ON public.cold_email_sequence
FOR EACH ROW
EXECUTE FUNCTION public.update_cold_email_updated_at();