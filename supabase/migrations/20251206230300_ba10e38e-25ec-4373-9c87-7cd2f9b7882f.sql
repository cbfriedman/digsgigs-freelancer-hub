-- PHASE 1: Create security definer helper functions

-- Function to check if user can access a conversation
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    LEFT JOIN digger_profiles dp ON c.digger_id = dp.id
    WHERE c.id = _conversation_id
    AND (c.consumer_id = _user_id OR dp.user_id = _user_id)
  )
$$;

-- PHASE 2: Fix profiles table RLS (Critical - removes email/phone exposure)

-- Drop the dangerous public access policy
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Create policy for users to view their own full profile
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a view for safe public profile access (non-sensitive fields only)
CREATE OR REPLACE VIEW public.safe_public_profiles AS
SELECT 
  id,
  full_name,
  user_type,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.safe_public_profiles TO authenticated;
GRANT SELECT ON public.safe_public_profiles TO anon;

-- PHASE 3: Secure references table

-- Ensure no anonymous/public access to references
DROP POLICY IF EXISTS "No public access to references" ON public.references;
CREATE POLICY "No public access to references"
ON public.references FOR SELECT
TO anon
USING (false);

-- PHASE 4: Strengthen conversations table with security definer function

-- Drop existing policies that use subqueries
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- Create new policies using the security definer function
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (public.can_access_conversation(auth.uid(), id));

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (public.can_access_conversation(auth.uid(), id));