-- =====================================================
-- HYBRID LEAD PRICING + PROFILE CLICK/CALL TRACKING
-- =====================================================

-- Add accumulated free clicks and subscription tracking to digger_profiles
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS accumulated_free_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_lapsed_at TIMESTAMP WITH TIME ZONE;

-- Create contact_reveals table (for lead contact reveals)
CREATE TABLE IF NOT EXISTS public.contact_reveals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
    gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
    revealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    cost_cents INTEGER NOT NULL,
    used_free_click BOOLEAN DEFAULT false,
    industry_category TEXT,
    subscription_tier TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(digger_id, gig_id)
);

-- Create profile_clicks table (for giggers clicking digger profiles)
CREATE TABLE IF NOT EXISTS public.profile_clicks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    digger_profile_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
    consumer_id UUID NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    cost_cents INTEGER NOT NULL,
    keyword_matched TEXT,
    google_avg_cpc_cents INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile_calls table (for giggers calling diggers)
CREATE TABLE IF NOT EXISTS public.profile_calls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    digger_profile_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
    consumer_id UUID NOT NULL,
    called_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    call_duration_seconds INTEGER,
    cost_cents INTEGER NOT NULL,
    keyword_matched TEXT,
    google_high_cpc_cents INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_reveals
CREATE POLICY "Diggers can view their own contact reveals"
ON public.contact_reveals FOR SELECT
USING (
    digger_id IN (
        SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Service role can insert contact reveals"
ON public.contact_reveals FOR INSERT
WITH CHECK (true);

-- RLS Policies for profile_clicks
CREATE POLICY "Diggers can view clicks on their profiles"
ON public.profile_clicks FOR SELECT
USING (
    digger_profile_id IN (
        SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Consumers can view their own clicks"
ON public.profile_clicks FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Authenticated users can create profile clicks"
ON public.profile_clicks FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for profile_calls
CREATE POLICY "Diggers can view calls to their profiles"
ON public.profile_calls FOR SELECT
USING (
    digger_profile_id IN (
        SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Consumers can view their own calls"
ON public.profile_calls FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Service role can insert profile calls"
ON public.profile_calls FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contact_reveals_digger_id ON public.contact_reveals(digger_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_gig_id ON public.contact_reveals(gig_id);
CREATE INDEX IF NOT EXISTS idx_profile_clicks_digger_id ON public.profile_clicks(digger_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_clicks_consumer_id ON public.profile_clicks(consumer_id);
CREATE INDEX IF NOT EXISTS idx_profile_calls_digger_id ON public.profile_calls(digger_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_calls_consumer_id ON public.profile_calls(consumer_id);

-- Function to add monthly free clicks for active subscribers
CREATE OR REPLACE FUNCTION add_monthly_free_clicks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Add 2 free clicks to all active subscribers
    UPDATE digger_profiles
    SET accumulated_free_clicks = accumulated_free_clicks + 2,
        updated_at = now()
    WHERE subscription_status = 'active';
END;
$$;

-- Function to expire clicks after grace period
CREATE OR REPLACE FUNCTION expire_grace_period_clicks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Reset clicks for users whose grace period (10 days) has expired
    UPDATE digger_profiles
    SET accumulated_free_clicks = 0,
        subscription_lapsed_at = NULL,
        updated_at = now()
    WHERE subscription_lapsed_at IS NOT NULL
    AND subscription_lapsed_at < now() - INTERVAL '10 days';
END;
$$;