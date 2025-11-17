-- Create keyword analytics table to track suggested keyword usage
CREATE TABLE IF NOT EXISTS public.keyword_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  profession TEXT,
  category_name TEXT,
  times_used INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_keyword_analytics_keyword ON public.keyword_analytics(keyword);
CREATE INDEX idx_keyword_analytics_profession ON public.keyword_analytics(profession);
CREATE INDEX idx_keyword_analytics_category ON public.keyword_analytics(category_name);
CREATE INDEX idx_keyword_analytics_times_used ON public.keyword_analytics(times_used DESC);

-- Enable RLS
ALTER TABLE public.keyword_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view analytics (for admin dashboard)
CREATE POLICY "Anyone can view keyword analytics"
  ON public.keyword_analytics
  FOR SELECT
  USING (true);

-- Policy: System can insert/update analytics (will be done via edge function)
CREATE POLICY "System can manage keyword analytics"
  ON public.keyword_analytics
  FOR ALL
  USING (true);

-- Function to track keyword usage
CREATE OR REPLACE FUNCTION public.track_keyword_usage(
  p_keyword TEXT,
  p_profession TEXT DEFAULT NULL,
  p_category_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to update existing record
  UPDATE keyword_analytics
  SET 
    times_used = times_used + 1,
    last_used_at = now()
  WHERE 
    keyword = p_keyword
    AND (profession = p_profession OR (profession IS NULL AND p_profession IS NULL))
    AND (category_name = p_category_name OR (category_name IS NULL AND p_category_name IS NULL));
  
  -- If no record exists, insert new one
  IF NOT FOUND THEN
    INSERT INTO keyword_analytics (keyword, profession, category_name)
    VALUES (p_keyword, p_profession, p_category_name);
  END IF;
END;
$$;

COMMENT ON TABLE public.keyword_analytics IS 'Tracks usage of suggested keywords to improve future suggestions';
COMMENT ON FUNCTION public.track_keyword_usage IS 'Records when a suggested keyword is used by a digger';