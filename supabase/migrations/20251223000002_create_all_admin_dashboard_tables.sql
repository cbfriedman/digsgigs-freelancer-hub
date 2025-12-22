-- Comprehensive migration to create all Admin Dashboard tables and update RLS policies
-- This ensures all tables used by the Admin Dashboard exist with proper permissions

-- ============================================================================
-- 1. Profile Completion Reminders (may already exist, but ensure RLS is correct)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_completion_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('3_day', '7_day', '14_day')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profile_completion_at_send INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_reminders_digger_id ON public.profile_completion_reminders(digger_id);
CREATE INDEX IF NOT EXISTS idx_profile_reminders_sent_at ON public.profile_completion_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_profile_reminders_type ON public.profile_completion_reminders(reminder_type);

ALTER TABLE public.profile_completion_reminders ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view all reminders" ON public.profile_completion_reminders;
DROP POLICY IF EXISTS "Users can view own reminders" ON public.profile_completion_reminders;

-- Create updated RLS policies using user_app_roles
CREATE POLICY "Admins can view all reminders"
  ON public.profile_completion_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'
        AND is_active = true
    )
  );

-- ============================================================================
-- 2. Keyword Suggestion Requests (may already exist, but update RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.keyword_suggestion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profession TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_keyword_requests_profession ON public.keyword_suggestion_requests(profession);
CREATE INDEX IF NOT EXISTS idx_keyword_requests_status ON public.keyword_suggestion_requests(status);
CREATE INDEX IF NOT EXISTS idx_keyword_requests_user_id ON public.keyword_suggestion_requests(user_id);

ALTER TABLE public.keyword_suggestion_requests ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can submit keyword requests" ON public.keyword_suggestion_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.keyword_suggestion_requests;
DROP POLICY IF EXISTS "Admins can view all keyword requests" ON public.keyword_suggestion_requests;
DROP POLICY IF EXISTS "Admins can update keyword requests" ON public.keyword_suggestion_requests;

-- Create updated policies
CREATE POLICY "Anyone can submit keyword requests"
  ON public.keyword_suggestion_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own requests"
  ON public.keyword_suggestion_requests
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all keyword requests"
  ON public.keyword_suggestion_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'
        AND is_active = true
    )
  );

CREATE POLICY "Admins can update keyword requests"
  ON public.keyword_suggestion_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'
        AND is_active = true
    )
  );

-- ============================================================================
-- 3. Cold Email Leads (already handled in previous migration, but ensure exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cold_email_leads (
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

CREATE TABLE IF NOT EXISTS public.cold_email_sequence (
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

ALTER TABLE public.cold_email_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_email_sequence ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage cold_email_leads" ON public.cold_email_leads;
DROP POLICY IF EXISTS "Admins can manage cold_email_sequence" ON public.cold_email_sequence;

-- Create updated policies
CREATE POLICY "Admins can manage cold_email_leads"
ON public.cold_email_leads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_app_roles
    WHERE user_id = auth.uid()
      AND app_role = 'admin'
      AND is_active = true
  )
);

CREATE POLICY "Admins can manage cold_email_sequence"
ON public.cold_email_sequence
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_app_roles
    WHERE user_id = auth.uid()
      AND app_role = 'admin'
      AND is_active = true
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cold_email_leads_status ON public.cold_email_leads(status);
CREATE INDEX IF NOT EXISTS idx_cold_email_leads_type ON public.cold_email_leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_cold_email_leads_email ON public.cold_email_leads(email);
CREATE INDEX IF NOT EXISTS idx_cold_email_sequence_next_send ON public.cold_email_sequence(next_send_at);
CREATE INDEX IF NOT EXISTS idx_cold_email_sequence_current_step ON public.cold_email_sequence(current_step);

-- ============================================================================
-- 4. Marketing Email Log (ensure exists with proper RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('marketing', 'reengagement')),
  reason text,
  campaign_name text,
  sent_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_log_type ON public.marketing_email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_sent_at ON public.marketing_email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_email_log_user_id ON public.marketing_email_log(user_id);

ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can view all marketing email logs" ON public.marketing_email_log;
DROP POLICY IF EXISTS "Service role can insert marketing email logs" ON public.marketing_email_log;

-- Create updated policies
CREATE POLICY "Admins can view all marketing email logs"
ON public.marketing_email_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_app_roles
    WHERE user_id = auth.uid()
      AND app_role = 'admin'
      AND is_active = true
  )
);

CREATE POLICY "Service role can insert marketing email logs"
ON public.marketing_email_log
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 5. Blog Tables (ensure they exist, RLS should already be correct)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.blog_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id),
  topic TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  settings_snapshot JSONB
);

-- Create indexes for blog tables
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON public.blog_post_tags(tag_id);

-- Enable RLS for blog tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_generation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_generation_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Create/Update functions and triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cold_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for cold_email tables
DROP TRIGGER IF EXISTS update_cold_email_leads_updated_at ON public.cold_email_leads;
CREATE TRIGGER update_cold_email_leads_updated_at
BEFORE UPDATE ON public.cold_email_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_cold_email_updated_at();

DROP TRIGGER IF EXISTS update_cold_email_sequence_updated_at ON public.cold_email_sequence;
CREATE TRIGGER update_cold_email_sequence_updated_at
BEFORE UPDATE ON public.cold_email_sequence
FOR EACH ROW
EXECUTE FUNCTION public.update_cold_email_updated_at();

-- Function to update blog_generation_settings updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for blog_generation_settings
DROP TRIGGER IF EXISTS update_blog_generation_settings_updated_at ON public.blog_generation_settings;
CREATE TRIGGER update_blog_generation_settings_updated_at
  BEFORE UPDATE ON public.blog_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for blog_posts
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. Ensure email_preferences has all required admin notification columns
-- ============================================================================
ALTER TABLE public.email_preferences
ADD COLUMN IF NOT EXISTS keyword_requests_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS lead_issues_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS bid_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS system_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digest_frequency TEXT CHECK (digest_frequency IN ('daily', 'weekly'));

-- Add comments for documentation
COMMENT ON COLUMN public.email_preferences.keyword_requests_enabled IS 'Receive emails when users request new keyword suggestions';
COMMENT ON COLUMN public.email_preferences.profile_reminders_enabled IS 'Receive emails related to profile completion reminders';
COMMENT ON COLUMN public.email_preferences.lead_issues_enabled IS 'Receive emails about lead return requests and issues';
COMMENT ON COLUMN public.email_preferences.bid_notifications_enabled IS 'Receive emails about new bids and bid updates';
COMMENT ON COLUMN public.email_preferences.system_alerts_enabled IS 'Receive critical system alerts and notifications';
COMMENT ON COLUMN public.email_preferences.digest_enabled IS 'Enable email digest (batched notifications)';
COMMENT ON COLUMN public.email_preferences.digest_frequency IS 'Frequency of email digest (daily or weekly)';

-- ============================================================================
-- 8. Insert initial blog data if tables are empty
-- ============================================================================
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Industry Insights', 'industry-insights', 'Latest trends and insights in the service industry'),
  ('How-To Guides', 'how-to-guides', 'Step-by-step guides for contractors and clients'),
  ('Success Stories', 'success-stories', 'Real stories from our community'),
  ('Pricing & Business', 'pricing-business', 'Tips on pricing, business growth, and profitability'),
  ('Platform Updates', 'platform-updates', 'Latest features and updates on digsandgigs')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_tags (name, slug) VALUES
  ('Contractors', 'contractors'),
  ('Clients', 'clients'),
  ('Pricing', 'pricing'),
  ('Marketing', 'marketing'),
  ('Tips', 'tips'),
  ('Freelancing', 'freelancing'),
  ('Business Growth', 'business-growth'),
  ('Lead Generation', 'lead-generation'),
  ('Success Tips', 'success-tips'),
  ('Platform Features', 'platform-features')
ON CONFLICT (slug) DO NOTHING;

