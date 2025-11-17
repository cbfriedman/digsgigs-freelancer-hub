-- Create blog categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blog tags table
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blog posts table
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

-- Create blog post tags junction table
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access
CREATE POLICY "Blog categories are viewable by everyone"
  ON public.blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Blog tags are viewable by everyone"
  ON public.blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Published blog posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Blog post tags are viewable by everyone"
  ON public.blog_post_tags FOR SELECT
  USING (true);

-- RLS Policies - Admin write access (you can add admin check later)
CREATE POLICY "Authenticated users can create blog categories"
  ON public.blog_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog categories"
  ON public.blog_categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create blog tags"
  ON public.blog_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog tags"
  ON public.blog_tags FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authors can create blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can create blog post tags"
  ON public.blog_post_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blog post tags"
  ON public.blog_post_tags FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX idx_blog_post_tags_post_id ON public.blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag_id ON public.blog_post_tags(tag_id);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE slug = post_slug AND status = 'published';
END;
$$;

-- Insert some initial categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Industry Insights', 'industry-insights', 'Latest trends and insights in the service industry'),
  ('How-To Guides', 'how-to-guides', 'Step-by-step guides for contractors and clients'),
  ('Success Stories', 'success-stories', 'Real stories from our community'),
  ('Pricing & Business', 'pricing-business', 'Tips on pricing, business growth, and profitability'),
  ('Platform Updates', 'platform-updates', 'Latest features and updates on digsandgigs')
ON CONFLICT (slug) DO NOTHING;

-- Insert some initial tags
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