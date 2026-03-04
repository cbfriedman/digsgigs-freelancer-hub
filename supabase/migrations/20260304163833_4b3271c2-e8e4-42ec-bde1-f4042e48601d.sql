
-- Abandoned gig drafts tracking
CREATE TABLE public.gig_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  project_types TEXT[] DEFAULT '{}',
  description TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  timeline TEXT,
  source TEXT DEFAULT 'website',
  follow_up_sent BOOLEAN DEFAULT false,
  follow_up_sent_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  converted_gig_id UUID REFERENCES public.gigs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gig_drafts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for draft tracking
CREATE POLICY "Anyone can insert drafts" ON public.gig_drafts
  FOR INSERT WITH CHECK (true);

-- Allow reading own drafts by session
CREATE POLICY "Users can read own drafts" ON public.gig_drafts
  FOR SELECT USING (true);

-- Allow updates for follow-up processing
CREATE POLICY "Service can update drafts" ON public.gig_drafts
  FOR UPDATE USING (true);

-- Referral tracking system
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_user_id UUID,
  referred_gig_id UUID REFERENCES public.gigs(id),
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount_cents INTEGER DEFAULT 0,
  reward_paid BOOLEAN DEFAULT false,
  reward_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Diggers can see their own referrals
CREATE POLICY "Diggers can view own referrals" ON public.referrals
  FOR SELECT USING (
    referrer_digger_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

-- Anyone can insert (for tracking referral clicks)
CREATE POLICY "Anyone can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- Service can update referral status
CREATE POLICY "Service can update referrals" ON public.referrals
  FOR UPDATE USING (true);

-- Index for fast lookups
CREATE INDEX idx_gig_drafts_email ON public.gig_drafts(email);
CREATE INDEX idx_gig_drafts_follow_up ON public.gig_drafts(follow_up_sent, created_at);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_digger_id);

-- Trigger for updated_at
CREATE TRIGGER update_gig_drafts_updated_at
  BEFORE UPDATE ON public.gig_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
