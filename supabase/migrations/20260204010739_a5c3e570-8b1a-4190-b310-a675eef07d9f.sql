-- Create table for AI callback requests
CREATE TABLE public.ai_callback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  retell_call_id TEXT,
  call_completed_at TIMESTAMP WITH TIME ZONE,
  gig_created BOOLEAN DEFAULT FALSE,
  gig_id UUID REFERENCES public.gigs(id),
  extracted_data JSONB,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_callback_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access"
  ON public.ai_callback_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for status queries
CREATE INDEX idx_ai_callback_requests_status ON public.ai_callback_requests(status);
CREATE INDEX idx_ai_callback_requests_scheduled ON public.ai_callback_requests(scheduled_for) WHERE status = 'pending';

-- Add trigger for updated_at
CREATE TRIGGER update_ai_callback_requests_updated_at
  BEFORE UPDATE ON public.ai_callback_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();