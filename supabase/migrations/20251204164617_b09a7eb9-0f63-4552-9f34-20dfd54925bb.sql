-- Create proxy_emails table for platform messaging
CREATE TABLE public.proxy_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proxy_address TEXT NOT NULL UNIQUE,
  real_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for quick lookups
CREATE INDEX idx_proxy_emails_proxy_address ON public.proxy_emails(proxy_address);
CREATE INDEX idx_proxy_emails_user_id ON public.proxy_emails(user_id);

-- Enable RLS
ALTER TABLE public.proxy_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own proxy emails
CREATE POLICY "Users can view their own proxy emails"
ON public.proxy_emails FOR SELECT
USING (auth.uid() = user_id);

-- System can manage proxy emails (for edge functions)
CREATE POLICY "Service role can manage proxy emails"
ON public.proxy_emails FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to generate unique proxy email
CREATE OR REPLACE FUNCTION public.generate_proxy_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proxy_addr TEXT;
  random_suffix TEXT;
BEGIN
  -- Check if user already has a proxy email
  SELECT proxy_address INTO proxy_addr
  FROM public.proxy_emails
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF proxy_addr IS NOT NULL THEN
    RETURN proxy_addr;
  END IF;
  
  -- Generate unique proxy email
  random_suffix := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  proxy_addr := 'user-' || random_suffix || '@digsandgigs.com';
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.proxy_emails WHERE proxy_address = proxy_addr) LOOP
    random_suffix := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    proxy_addr := 'user-' || random_suffix || '@digsandgigs.com';
  END LOOP;
  
  -- Insert new proxy email
  INSERT INTO public.proxy_emails (user_id, proxy_address, real_email)
  SELECT p_user_id, proxy_addr, email
  FROM auth.users WHERE id = p_user_id;
  
  RETURN proxy_addr;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_proxy_emails_updated_at
BEFORE UPDATE ON public.proxy_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();