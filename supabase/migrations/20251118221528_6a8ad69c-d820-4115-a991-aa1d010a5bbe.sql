-- Create profile_views table to track when consumers view digger profiles
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_charged NUMERIC NOT NULL DEFAULT 50,
  UNIQUE(consumer_id, digger_id)
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Consumers can view their own profile views
CREATE POLICY "Consumers can view own profile views"
ON public.profile_views
FOR SELECT
USING (auth.uid() = consumer_id);

-- Consumers can create profile view records
CREATE POLICY "Consumers can create profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (auth.uid() = consumer_id);

-- Diggers can view who has viewed their profile
CREATE POLICY "Diggers can view their profile views"
ON public.profile_views
FOR SELECT
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_profile_views_consumer_digger ON public.profile_views(consumer_id, digger_id);
CREATE INDEX idx_profile_views_digger ON public.profile_views(digger_id);