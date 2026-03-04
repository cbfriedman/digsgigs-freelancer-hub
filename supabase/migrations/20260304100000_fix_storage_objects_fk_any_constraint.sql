-- Fix any FK from storage.objects to auth.users (any constraint name) so user deletion works.
-- Run this if 20260303100000 did nothing because your project uses different constraint names.

DO $$
DECLARE
  r RECORD;
  col_names text;
BEGIN
  FOR r IN
    SELECT
      c.conname AS constraint_name,
      (
        SELECT string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND NOT a.attisdropped
          AND a.attnum > 0
      ) AS column_names
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_class ref ON ref.oid = c.confrelid
    JOIN pg_namespace refns ON refns.oid = ref.relnamespace
    WHERE c.contype = 'f'
      AND tn.nspname = 'storage'
      AND t.relname = 'objects'
      AND refns.nspname = 'auth'
      AND ref.relname = 'users'
  LOOP
    EXECUTE format(
      'ALTER TABLE storage.objects DROP CONSTRAINT %I',
      r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE storage.objects ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES auth.users(id) ON DELETE SET NULL',
      r.constraint_name,
      r.column_names
    );
    RAISE NOTICE 'Updated storage.objects constraint % to ON DELETE SET NULL', r.constraint_name;
  END LOOP;
END $$;
