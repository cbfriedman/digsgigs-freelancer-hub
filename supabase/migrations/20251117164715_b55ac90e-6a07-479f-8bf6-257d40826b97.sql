-- Create table for blog generation settings
CREATE TABLE IF NOT EXISTS public.blog_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  topics TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_categories UUID[] DEFAULT '{}',
  target_tags UUID[] DEFAULT '{}',
  tone TEXT DEFAULT 'professional',
  word_count INTEGER DEFAULT 800,
  include_images BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_generation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own settings"
  ON public.blog_generation_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.blog_generation_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.blog_generation_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.blog_generation_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for blog generation history
CREATE TABLE IF NOT EXISTS public.blog_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id),
  topic TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  settings_snapshot JSONB
);

-- Enable RLS
ALTER TABLE public.blog_generation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - admins can view all history
CREATE POLICY "Anyone can view generation history"
  ON public.blog_generation_history
  FOR SELECT
  USING (true);

-- Update trigger for blog_generation_settings
CREATE TRIGGER update_blog_generation_settings_updated_at
  BEFORE UPDATE ON public.blog_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();