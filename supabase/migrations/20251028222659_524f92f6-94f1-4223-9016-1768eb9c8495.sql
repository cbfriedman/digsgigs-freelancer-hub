-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  user_type TEXT CHECK (user_type IN ('digger', 'consumer')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES public.categories(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are public readable
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

-- Create digger_profiles table for detailed digger information
CREATE TABLE public.digger_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profession TEXT NOT NULL,
  bio TEXT,
  portfolio_url TEXT,
  hourly_rate DECIMAL(10,2),
  years_experience INTEGER,
  profile_image_url TEXT,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  monthly_inquiries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on digger_profiles
ALTER TABLE public.digger_profiles ENABLE ROW LEVEL SECURITY;

-- Digger profiles policies
CREATE POLICY "Anyone can view digger profiles"
  ON public.digger_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Diggers can update own profile"
  ON public.digger_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Diggers can insert own profile"
  ON public.digger_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create junction table for diggers and categories (many-to-many)
CREATE TABLE public.digger_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(digger_id, category_id)
);

-- Enable RLS on digger_categories
ALTER TABLE public.digger_categories ENABLE ROW LEVEL SECURITY;

-- Digger categories policies
CREATE POLICY "Anyone can view digger categories"
  ON public.digger_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Diggers can manage own categories"
  ON public.digger_categories FOR ALL
  TO authenticated
  USING (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()));

-- Create references table for verifiable references
CREATE TABLE public.references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE NOT NULL,
  reference_name TEXT NOT NULL,
  reference_email TEXT NOT NULL,
  reference_phone TEXT,
  project_description TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on references
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

-- References policies - contact info hidden from public
CREATE POLICY "Diggers can view own references"
  ON public.references FOR SELECT
  TO authenticated
  USING (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Diggers can insert own references"
  ON public.references FOR INSERT
  TO authenticated
  WITH CHECK (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Diggers can update own references"
  ON public.references FOR UPDATE
  TO authenticated
  USING (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()));

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE NOT NULL,
  consumer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(digger_id, consumer_id)
);

-- Enable RLS on ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Ratings policies - public readable, consumer writable
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consumers can create ratings"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can update own ratings"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (consumer_id = auth.uid());

-- Create gigs table
CREATE TABLE public.gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  deadline DATE,
  status TEXT CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on gigs
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

-- Gigs policies
CREATE POLICY "Anyone can view open gigs"
  ON public.gigs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consumers can create gigs"
  ON public.gigs FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can update own gigs"
  ON public.gigs FOR UPDATE
  TO authenticated
  USING (consumer_id = auth.uid());

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_digger_profiles_updated_at
  BEFORE UPDATE ON public.digger_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at
  BEFORE UPDATE ON public.gigs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'consumer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample categories
INSERT INTO public.categories (name, description) VALUES
  ('Building & Construction', 'General construction and building services'),
  ('Carpentry', 'Woodworking and carpentry services'),
  ('Plumbing', 'Plumbing installation and repair'),
  ('Electrical', 'Electrical installation and repair'),
  ('HVAC', 'Heating, ventilation, and air conditioning'),
  ('Painting', 'Interior and exterior painting'),
  ('Roofing', 'Roof installation and repair'),
  ('Landscaping', 'Landscape design and maintenance'),
  ('Legal Services', 'Legal consultation and representation'),
  ('Family Law', 'Divorce, custody, family matters'),
  ('Corporate Law', 'Business and corporate legal services'),
  ('Criminal Law', 'Criminal defense and prosecution'),
  ('Real Estate Law', 'Property and real estate legal matters'),
  ('Web Development', 'Website design and development'),
  ('Graphic Design', 'Visual design and branding'),
  ('Content Writing', 'Content creation and copywriting'),
  ('Digital Marketing', 'Online marketing and SEO'),
  ('Photography', 'Professional photography services'),
  ('Video Production', 'Video recording and editing');

-- Create function to update digger rating averages
CREATE OR REPLACE FUNCTION public.update_digger_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.digger_profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.ratings
      WHERE digger_id = COALESCE(NEW.digger_id, OLD.digger_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.ratings
      WHERE digger_id = COALESCE(NEW.digger_id, OLD.digger_id)
    )
  WHERE id = COALESCE(NEW.digger_id, OLD.digger_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_digger_rating();