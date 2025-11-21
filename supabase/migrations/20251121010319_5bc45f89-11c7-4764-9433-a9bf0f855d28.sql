-- Add telemarketer role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'telemarketer';

-- Create telemarketer_profiles table
CREATE TABLE public.telemarketer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  compensation_type TEXT NOT NULL DEFAULT 'percentage' CHECK (compensation_type IN ('percentage', 'flat_fee')),
  commission_percentage NUMERIC DEFAULT 35.0,
  flat_fee_amount NUMERIC DEFAULT 25.0,
  total_leads_uploaded INTEGER DEFAULT 0,
  total_commissions_earned NUMERIC DEFAULT 0,
  pending_commissions NUMERIC DEFAULT 0,
  paid_commissions NUMERIC DEFAULT 0,
  stripe_connect_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.telemarketer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telemarketers
CREATE POLICY "Telemarketers can view own profile"
  ON public.telemarketer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Telemarketers can update own profile"
  ON public.telemarketer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Telemarketers can insert own profile"
  ON public.telemarketer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all telemarketer profiles"
  ON public.telemarketer_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_telemarketer_profiles_updated_at
  BEFORE UPDATE ON public.telemarketer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_telemarketer_profiles_user_id ON public.telemarketer_profiles(user_id);