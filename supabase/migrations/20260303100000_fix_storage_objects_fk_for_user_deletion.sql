-- Allow auth.users to be deleted when they own storage.objects.
-- Without this, admin-manage-user delete returns "Database error deleting user"
-- because storage.objects.owner (or owner_id) references auth.users(id).
-- We set ON DELETE SET NULL so objects remain but ownership is cleared.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'storage'
      AND table_name = 'objects'
      AND constraint_name = 'objects_owner_fkey'
  ) THEN
    ALTER TABLE storage.objects
      DROP CONSTRAINT objects_owner_fkey,
      ADD CONSTRAINT objects_owner_fkey
        FOREIGN KEY (owner)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Some Supabase versions use owner_id instead of owner
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'storage'
      AND table_name = 'objects'
      AND constraint_name = 'objects_owner_id_fkey'
  ) THEN
    ALTER TABLE storage.objects
      DROP CONSTRAINT objects_owner_id_fkey,
      ADD CONSTRAINT objects_owner_id_fkey
        FOREIGN KEY (owner_id)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;
