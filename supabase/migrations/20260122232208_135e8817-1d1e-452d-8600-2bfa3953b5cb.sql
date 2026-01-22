-- Create subscribers table for low-friction lead capture
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  categories TEXT[], -- e.g., ['Plumber', 'HVAC Technician']
  source TEXT DEFAULT 'organic', -- 'facebook_lead', 'reddit', 'organic'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  stripe_customer_id TEXT,
  unsubscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Link to full profile if they upgrade
  converted_to_digger_id UUID REFERENCES public.digger_profiles(id)
);

-- Create subscriber lead purchases table
CREATE TABLE public.subscriber_lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  purchase_price_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'refunded'
  UNIQUE(subscriber_id, gig_id)
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_lead_purchases ENABLE ROW LEVEL SECURITY;

-- RLS for subscribers: Admin access only (service role handles inserts)
CREATE POLICY "Admin can manage subscribers"
  ON public.subscribers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow public inserts for subscription form (no auth required)
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers
  FOR INSERT
  WITH CHECK (true);

-- RLS for subscriber_lead_purchases: Admin access only
CREATE POLICY "Admin can manage subscriber purchases"
  ON public.subscriber_lead_purchases
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscribers_source ON public.subscribers(source);
CREATE INDEX idx_subscribers_unsubscribed ON public.subscribers(unsubscribed) WHERE unsubscribed = false;
CREATE INDEX idx_subscriber_purchases_subscriber ON public.subscriber_lead_purchases(subscriber_id);
CREATE INDEX idx_subscriber_purchases_gig ON public.subscriber_lead_purchases(gig_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();