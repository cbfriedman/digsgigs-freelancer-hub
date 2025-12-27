-- Add Founding Digger columns to digger_profiles
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS is_founding_digger boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS founding_digger_number integer,
ADD COLUMN IF NOT EXISTS lead_price_lock_expires_at timestamp with time zone;

-- Create platform_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify platform settings
CREATE POLICY "Admins can view platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings" 
ON public.platform_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert platform settings" 
ON public.platform_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial Founding Digger program settings
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'founding_digger_program',
  '{"status": "open", "limit": 500, "current_count": 0, "subscription_price_cents": 1900, "lead_price_lock_months": 12}'::jsonb,
  'Controls the Founding Digger program: status (open/closed), limit, and pricing'
)
ON CONFLICT (key) DO NOTHING;

-- Create function to register a Founding Digger
CREATE OR REPLACE FUNCTION public.register_founding_digger(p_digger_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  program_settings jsonb;
  current_count integer;
  program_limit integer;
  program_status text;
  next_number integer;
BEGIN
  -- Get current program settings
  SELECT value INTO program_settings
  FROM public.platform_settings
  WHERE key = 'founding_digger_program';
  
  IF program_settings IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Program settings not found');
  END IF;
  
  program_status := program_settings->>'status';
  current_count := (program_settings->>'current_count')::integer;
  program_limit := (program_settings->>'limit')::integer;
  
  -- Check if program is still open
  IF program_status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Founding Digger program is closed');
  END IF;
  
  -- Check if limit reached
  IF current_count >= program_limit THEN
    -- Auto-close the program
    UPDATE public.platform_settings
    SET value = value || '{"status": "closed"}'::jsonb,
        updated_at = now()
    WHERE key = 'founding_digger_program';
    
    RETURN jsonb_build_object('success', false, 'error', 'Founding Digger limit reached');
  END IF;
  
  -- Check if already a founding digger
  IF EXISTS (SELECT 1 FROM public.digger_profiles WHERE id = p_digger_id AND is_founding_digger = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a Founding Digger');
  END IF;
  
  -- Assign founding digger status
  next_number := current_count + 1;
  
  UPDATE public.digger_profiles
  SET is_founding_digger = true,
      founding_digger_number = next_number,
      lead_price_lock_expires_at = now() + interval '1 year',
      price_locked = true,
      original_price_cents = 1900,
      updated_at = now()
  WHERE id = p_digger_id;
  
  -- Increment counter in settings
  UPDATE public.platform_settings
  SET value = value || jsonb_build_object('current_count', next_number),
      updated_at = now()
  WHERE key = 'founding_digger_program';
  
  -- Check if we just hit the limit
  IF next_number >= program_limit THEN
    UPDATE public.platform_settings
    SET value = value || '{"status": "closed"}'::jsonb,
        updated_at = now()
    WHERE key = 'founding_digger_program';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'founding_digger_number', next_number,
    'lead_price_lock_expires_at', now() + interval '1 year',
    'remaining_spots', program_limit - next_number
  );
END;
$$;

-- Create function to check founding digger lead pricing status
CREATE OR REPLACE FUNCTION public.get_founding_digger_pricing(p_digger_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digger_record record;
  lead_lock_active boolean;
  days_remaining integer;
BEGIN
  SELECT 
    is_founding_digger,
    founding_digger_number,
    lead_price_lock_expires_at,
    price_locked,
    subscription_status
  INTO digger_record
  FROM public.digger_profiles
  WHERE id = p_digger_id;
  
  IF digger_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Digger not found');
  END IF;
  
  IF NOT digger_record.is_founding_digger THEN
    RETURN jsonb_build_object(
      'is_founding_digger', false,
      'subscription_locked', false,
      'lead_price_locked', false
    );
  END IF;
  
  lead_lock_active := digger_record.lead_price_lock_expires_at > now();
  days_remaining := GREATEST(0, EXTRACT(DAY FROM digger_record.lead_price_lock_expires_at - now())::integer);
  
  RETURN jsonb_build_object(
    'is_founding_digger', true,
    'founding_digger_number', digger_record.founding_digger_number,
    'subscription_locked', true,
    'subscription_price_cents', 1900,
    'lead_price_locked', lead_lock_active,
    'lead_price_lock_expires_at', digger_record.lead_price_lock_expires_at,
    'lead_lock_days_remaining', days_remaining,
    'low_value_lead_cents', CASE WHEN lead_lock_active THEN 1000 ELSE NULL END,
    'high_value_lead_cents', CASE WHEN lead_lock_active THEN 2500 ELSE NULL END
  );
END;
$$;

-- Create index for faster founding digger queries
CREATE INDEX IF NOT EXISTS idx_digger_profiles_founding ON public.digger_profiles (is_founding_digger) WHERE is_founding_digger = true;