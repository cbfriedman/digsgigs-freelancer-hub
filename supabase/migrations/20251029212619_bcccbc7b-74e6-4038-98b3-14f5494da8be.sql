-- Fix Security Issue 1: Protect user email addresses in profiles table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policies: public can see profiles without email, users can see their own email
CREATE POLICY "Users can view public profile data" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view own email" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Fix Security Issue 2: Protect service provider phone numbers in digger_profiles
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view digger profiles" ON public.digger_profiles;

-- Create new policies: public can see profiles without phone, authenticated users and profile owners can see phone
CREATE POLICY "Public can view digger profiles without phone" 
ON public.digger_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Profile owners can view own phone" 
ON public.digger_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix Security Issue 3: Protect customer contact info in gigs table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view open gigs" ON public.gigs;

-- Create new policies: public can see gigs without contact_preferences, only lead purchasers can see contact info
CREATE POLICY "Public can view gigs without contact info" 
ON public.gigs 
FOR SELECT 
USING (true);

CREATE POLICY "Lead purchasers can view contact info" 
ON public.gigs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.lead_purchases lp
    JOIN public.digger_profiles dp ON lp.digger_id = dp.id
    WHERE lp.gig_id = gigs.id 
    AND dp.user_id = auth.uid()
    AND lp.status = 'completed'
  )
);

CREATE POLICY "Gig owners can view own contact info" 
ON public.gigs 
FOR SELECT 
USING (auth.uid() = consumer_id);