-- Sprint 2: Gigger role-specific setup fields

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gigger_project_categories text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gigger_budget_min numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gigger_budget_max numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gigger_preferred_location text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gigger_contact_preference text DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gigger_contact_preference_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_gigger_contact_preference_check
    CHECK (
      gigger_contact_preference IS NULL OR
      gigger_contact_preference IN ('email', 'phone', 'both')
    );
  END IF;
END $$;
