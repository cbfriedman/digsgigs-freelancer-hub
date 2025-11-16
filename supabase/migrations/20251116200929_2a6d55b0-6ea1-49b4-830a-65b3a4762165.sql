-- Create table to track saved search alert sends
CREATE TABLE IF NOT EXISTS public.saved_search_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  matches_found INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own alert history
CREATE POLICY "Users can view own alert history"
  ON public.saved_search_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_saved_search_alerts_user_id ON public.saved_search_alerts(user_id);
CREATE INDEX idx_saved_search_alerts_search_id ON public.saved_search_alerts(saved_search_id);
CREATE INDEX idx_saved_search_alerts_sent_at ON public.saved_search_alerts(sent_at DESC);