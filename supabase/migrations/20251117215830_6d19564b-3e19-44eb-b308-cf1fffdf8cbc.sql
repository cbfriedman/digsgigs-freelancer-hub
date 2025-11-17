-- Add RLS policy for admins to view all keyword requests
CREATE POLICY "Admins can view all keyword requests"
ON public.keyword_suggestion_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Add RLS policy for admins to update keyword requests
CREATE POLICY "Admins can update keyword requests"
ON public.keyword_suggestion_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);