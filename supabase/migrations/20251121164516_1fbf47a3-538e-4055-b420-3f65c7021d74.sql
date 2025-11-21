-- Phase 1: Multi-Role System Database Schema

-- 1.1 Create Application Roles Enum (separate from admin roles)
CREATE TYPE public.user_app_role AS ENUM ('digger', 'gigger', 'telemarketer');

-- 1.2 Create Application Roles Table (separate from user_roles)
CREATE TABLE public.user_app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_role user_app_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_role)
);

-- 1.3 Create indexes for performance
CREATE INDEX idx_user_app_roles_user_id ON public.user_app_roles(user_id);
CREATE INDEX idx_user_app_roles_app_role ON public.user_app_roles(app_role);
CREATE INDEX idx_user_app_roles_active ON public.user_app_roles(user_id, is_active);

-- 1.4 Enable RLS
ALTER TABLE public.user_app_roles ENABLE ROW LEVEL SECURITY;

-- 1.5 Create Security Definer Function to check app roles
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role user_app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_roles
    WHERE user_id = _user_id 
      AND app_role = _role
      AND is_active = true
  )
$$;

-- 1.6 Create function to get all user app roles
CREATE OR REPLACE FUNCTION public.get_user_app_roles(_user_id UUID)
RETURNS SETOF user_app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role
  FROM public.user_app_roles
  WHERE user_id = _user_id 
    AND is_active = true
  ORDER BY last_used_at DESC NULLS LAST, created_at ASC
$$;

-- 1.7 RLS Policies for user_app_roles
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own app roles"
  ON public.user_app_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own app roles"
  ON public.user_app_roles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 1.8 Update profiles table to deprecate user_type
ALTER TABLE public.profiles
ALTER COLUMN user_type DROP NOT NULL;

COMMENT ON COLUMN public.profiles.user_type IS 'DEPRECATED: Use user_app_roles table instead. This column maintained for backward compatibility only.';

-- 1.9 Migrate existing users to new role system
INSERT INTO public.user_app_roles (user_id, app_role, created_at)
SELECT 
  id,
  CASE 
    WHEN user_type = 'digger' THEN 'digger'::user_app_role
    WHEN user_type = 'consumer' THEN 'gigger'::user_app_role
    ELSE 'gigger'::user_app_role -- Default to gigger for any other values
  END,
  created_at
FROM public.profiles
WHERE user_type IS NOT NULL
ON CONFLICT (user_id, app_role) DO NOTHING;

-- 1.10 Create trigger to sync role updates (temporary, for backward compatibility)
CREATE OR REPLACE FUNCTION sync_user_type_to_app_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user_type is updated, ensure corresponding app_role exists
  IF NEW.user_type IS NOT NULL AND (OLD.user_type IS NULL OR OLD.user_type != NEW.user_type) THEN
    INSERT INTO public.user_app_roles (user_id, app_role)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.user_type = 'digger' THEN 'digger'::user_app_role
        WHEN NEW.user_type = 'consumer' THEN 'gigger'::user_app_role
        ELSE 'gigger'::user_app_role
      END
    )
    ON CONFLICT (user_id, app_role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_user_type_to_app_roles
  AFTER INSERT OR UPDATE OF user_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_type_to_app_roles();