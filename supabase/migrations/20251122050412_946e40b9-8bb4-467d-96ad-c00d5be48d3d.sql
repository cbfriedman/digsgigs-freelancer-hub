-- Add unique constraint to ensure one digger profile per user
ALTER TABLE public.digger_profiles 
ADD CONSTRAINT digger_profiles_user_id_unique UNIQUE (user_id);

-- Create professions table for multiple professions per digger profile
CREATE TABLE public.digger_professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_profile_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  profession_name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create specialties table for multiple specialties per profession
CREATE TABLE public.digger_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_id UUID NOT NULL REFERENCES public.digger_professions(id) ON DELETE CASCADE,
  specialty_name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digger_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digger_specialties ENABLE ROW LEVEL SECURITY;

-- RLS policies for digger_professions
CREATE POLICY "Users can view their own professions"
  ON public.digger_professions FOR SELECT
  USING (
    digger_profile_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own professions"
  ON public.digger_professions FOR INSERT
  WITH CHECK (
    digger_profile_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own professions"
  ON public.digger_professions FOR UPDATE
  USING (
    digger_profile_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own professions"
  ON public.digger_professions FOR DELETE
  USING (
    digger_profile_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS policies for digger_specialties
CREATE POLICY "Users can view their own specialties"
  ON public.digger_specialties FOR SELECT
  USING (
    profession_id IN (
      SELECT dp.id FROM public.digger_professions dp
      JOIN public.digger_profiles d ON dp.digger_profile_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own specialties"
  ON public.digger_specialties FOR INSERT
  WITH CHECK (
    profession_id IN (
      SELECT dp.id FROM public.digger_professions dp
      JOIN public.digger_profiles d ON dp.digger_profile_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own specialties"
  ON public.digger_specialties FOR UPDATE
  USING (
    profession_id IN (
      SELECT dp.id FROM public.digger_professions dp
      JOIN public.digger_profiles d ON dp.digger_profile_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own specialties"
  ON public.digger_specialties FOR DELETE
  USING (
    profession_id IN (
      SELECT dp.id FROM public.digger_professions dp
      JOIN public.digger_profiles d ON dp.digger_profile_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for professions
CREATE TRIGGER update_digger_professions_updated_at
  BEFORE UPDATE ON public.digger_professions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for specialties
CREATE TRIGGER update_digger_specialties_updated_at
  BEFORE UPDATE ON public.digger_specialties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();