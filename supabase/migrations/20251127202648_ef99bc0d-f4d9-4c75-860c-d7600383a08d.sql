-- Create a table for specialty requests requiring admin approval
CREATE TABLE IF NOT EXISTS public.specialty_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  industry text NOT NULL,
  profession text NOT NULL,
  specialty_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profession, specialty_name)
);

-- Enable RLS
ALTER TABLE public.specialty_requests ENABLE ROW LEVEL SECURITY;

-- Diggers can create specialty requests
CREATE POLICY "Diggers can create specialty requests"
ON public.specialty_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own specialty requests"
ON public.specialty_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all specialty requests"
ON public.specialty_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update specialty requests"
ON public.specialty_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_specialty_requests_updated_at
BEFORE UPDATE ON public.specialty_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();