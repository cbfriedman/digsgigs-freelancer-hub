-- Locations reference tables: countries, regions (states/territories), cities.
-- Enables platform-wide consistent location selection and referencing.

-- Countries (ISO 3166-1 alpha-2)
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_alpha2 char(2) NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code_alpha2);
CREATE INDEX IF NOT EXISTS idx_countries_name_lower ON public.countries(lower(name));

COMMENT ON TABLE public.countries IS 'All countries (ISO 3166-1 alpha-2). Used for location selection and FK references.';

-- Regions (states, provinces, territories) per country
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  type text DEFAULT 'state'
);

CREATE INDEX IF NOT EXISTS idx_regions_country ON public.regions(country_id);
CREATE INDEX IF NOT EXISTS idx_regions_name_lower ON public.regions(country_id, lower(name));

COMMENT ON TABLE public.regions IS 'States, provinces, territories per country. Referenced by profiles for location.';

-- Cities (optional; can be extended later)
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  name text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_region ON public.cities(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_name_lower ON public.cities(country_id, lower(name));

COMMENT ON TABLE public.cities IS 'Cities; region_id null when country has no regions (e.g. Singapore).';

-- RLS: allow read for everyone (location data is public reference data)
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are readable by all"
  ON public.countries FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Regions are readable by all"
  ON public.regions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Cities are readable by all"
  ON public.cities FOR SELECT TO anon, authenticated USING (true);

-- Optional FK columns on profile tables (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'digger_profiles' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE public.digger_profiles
      ADD COLUMN country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
      ADD COLUMN region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
      ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gigger_profiles' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE public.gigger_profiles
      ADD COLUMN country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
      ADD COLUMN region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
      ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'country_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
      ADD COLUMN region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
      ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;
  END IF;
END $$;
