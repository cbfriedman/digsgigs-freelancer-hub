-- Fix ALL foreign keys to auth.users that have no ON DELETE, so admin user deletion succeeds.
-- Covers: storage (if any), public.reviewed_by, approved_by, resolved_by, tester_id,
-- keyword_suggestion_requests.user_id, blog_generation_settings.user_id, etc.

DO $$
DECLARE
  r RECORD;
  col_names text;
  col_nullable boolean;
  new_action text;
BEGIN
  FOR r IN
    SELECT
      c.conname AS constraint_name,
      t.relnamespace::regnamespace::text AS schema_name,
      t.relname AS table_name,
      (
        SELECT string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND NOT a.attisdropped
          AND a.attnum > 0
      ) AS column_names,
      -- any of the constrained columns is NOT NULL => use CASCADE (delete row when user deleted)
      (
        SELECT bool_or(NOT a.attnotnull)
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
          AND NOT a.attisdropped
          AND a.attnum > 0
      ) AS any_nullable
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_class ref ON ref.oid = c.confrelid
    JOIN pg_namespace refns ON refns.oid = ref.relnamespace
    WHERE c.contype = 'f'
      AND refns.nspname = 'auth'
      AND ref.relname = 'users'
      -- only constraints that don't already have ON DELETE SET NULL or ON DELETE CASCADE
      AND NOT (
        c.confdeltype = 'n'  -- SET NULL
        OR c.confdeltype = 'c'  -- CASCADE
      )
  LOOP
    new_action := CASE WHEN r.any_nullable THEN 'SET NULL' ELSE 'CASCADE' END;
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name,
      r.table_name,
      r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES auth.users(id) ON DELETE %s',
      r.schema_name,
      r.table_name,
      r.constraint_name,
      r.column_names,
      new_action
    );
    RAISE NOTICE 'Updated %.%(%) -> auth.users ON DELETE %', r.schema_name, r.table_name, r.column_names, new_action;
  END LOOP;
END $$;
