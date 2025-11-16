-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('gigs', 'diggers')),
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
ON public.saved_searches
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_search_type ON public.saved_searches(search_type);
CREATE INDEX idx_saved_searches_email_alerts ON public.saved_searches(email_alerts_enabled) WHERE email_alerts_enabled = true;

-- Add trigger for updated_at
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add location column to gigs table for map filtering
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS location_lat NUMERIC;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS location_lng NUMERIC;

-- Add location column to digger_profiles table for map filtering
ALTER TABLE public.digger_profiles ADD COLUMN IF NOT EXISTS location_lat NUMERIC;
ALTER TABLE public.digger_profiles ADD COLUMN IF NOT EXISTS location_lng NUMERIC;