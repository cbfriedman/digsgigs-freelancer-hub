-- Make the first user an admin (the oldest account)
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user (oldest created account)
  SELECT id INTO first_user_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If a user exists, make them admin
  IF first_user_id IS NOT NULL THEN
    -- Insert admin role (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Ensure email preferences exist
    INSERT INTO public.email_preferences (user_id)
    VALUES (first_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Admin user created: %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found in profiles table';
  END IF;
END $$;