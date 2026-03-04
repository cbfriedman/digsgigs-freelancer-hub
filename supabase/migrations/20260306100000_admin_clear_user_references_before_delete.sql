-- Clear all references to a user so auth.admin.deleteUser can succeed.
-- Call this from admin-manage-user edge function before deleteUser.
-- Handles storage.objects (owner/owner_id) and any nullable public FKs that might still block.

CREATE OR REPLACE FUNCTION public.admin_clear_user_references(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
BEGIN
  -- storage.objects: clear ownership so FK to auth.users doesn't block delete
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner'
  ) THEN
    UPDATE storage.objects SET owner = NULL WHERE owner = target_user_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner_id'
  ) THEN
    UPDATE storage.objects SET owner_id = NULL WHERE owner_id = target_user_id::text;
  END IF;

  -- Null out nullable FK columns in public schema that reference auth.users
  -- (covers any table that might still have ON DELETE RESTRICT)
  UPDATE public.account_deletion_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.profile_identity_update_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.id_verification_submissions SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.profession_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.lead_issues SET resolved_by = NULL WHERE resolved_by = target_user_id;
  UPDATE public.specialty_requests SET approved_by = NULL WHERE approved_by = target_user_id;
  UPDATE public.manual_test_results SET tester_id = NULL WHERE tester_id = target_user_id;
  UPDATE public.keyword_suggestion_requests SET user_id = NULL WHERE user_id = target_user_id;
END $$;

COMMENT ON FUNCTION public.admin_clear_user_references(uuid) IS
  'Clears storage.objects ownership and nullable public FKs for the given user so auth.admin.deleteUser can succeed. Call from admin-manage-user edge function.';
