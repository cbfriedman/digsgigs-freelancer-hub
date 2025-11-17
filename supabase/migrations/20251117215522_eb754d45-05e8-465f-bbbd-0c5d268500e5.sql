-- Create table for keyword suggestion requests
CREATE TABLE IF NOT EXISTS public.keyword_suggestion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profession TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.keyword_suggestion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit a request
CREATE POLICY "Anyone can submit keyword requests"
ON public.keyword_suggestion_requests
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.keyword_suggestion_requests
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Index for faster lookups
CREATE INDEX idx_keyword_requests_profession ON public.keyword_suggestion_requests(profession);
CREATE INDEX idx_keyword_requests_status ON public.keyword_suggestion_requests(status);