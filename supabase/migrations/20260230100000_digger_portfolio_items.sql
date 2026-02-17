-- Upwork-style portfolio: multiple items per digger with title, description, media, skills, category
CREATE TABLE IF NOT EXISTS public.digger_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_profile_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  project_url text,
  skills text[] DEFAULT '{}',
  category text,
  media jsonb DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digger_portfolio_items IS 'Portfolio projects for Diggers: work history with title, description, link, media (images/gif/video), skills, category. Upwork-style.';
COMMENT ON COLUMN public.digger_portfolio_items.media IS 'Array of { type: "image"|"video", url: string }. URLs from storage or external.';

CREATE INDEX IF NOT EXISTS idx_digger_portfolio_items_digger_profile_id
  ON public.digger_portfolio_items(digger_profile_id);
CREATE INDEX IF NOT EXISTS idx_digger_portfolio_items_sort
  ON public.digger_portfolio_items(digger_profile_id, sort_order);

ALTER TABLE public.digger_portfolio_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view portfolio items (shown on public profile)
CREATE POLICY "Public can view digger portfolio items"
  ON public.digger_portfolio_items FOR SELECT
  USING (true);

-- Only profile owner can insert/update/delete
CREATE POLICY "Diggers can insert own portfolio items"
  ON public.digger_portfolio_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );

CREATE POLICY "Diggers can update own portfolio items"
  ON public.digger_portfolio_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );

CREATE POLICY "Diggers can delete own portfolio items"
  ON public.digger_portfolio_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );

-- Storage bucket for portfolio media (images, GIFs, video). Public read so Giggers can view.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-media',
  'portfolio-media',
  true,
  50 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];

-- Path: {digger_profile_id}/{item_id}/{filename}
-- SELECT: public (bucket is public)
CREATE POLICY "Anyone can view portfolio media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-media');

CREATE POLICY "Diggers can upload portfolio media for own profile"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-media'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can update portfolio media for own profile"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can delete portfolio media for own profile"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND EXISTS (
      SELECT 1 FROM public.digger_profiles dp
      WHERE dp.id = (storage.foldername(name))[1]::uuid AND dp.user_id = auth.uid()
    )
  );
