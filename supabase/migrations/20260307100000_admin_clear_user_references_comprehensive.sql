-- Comprehensive cleanup: clear or delete EVERY reference to the user so auth.admin.deleteUser always succeeds.
-- Replaces admin_clear_user_references with a version that uses dynamic SQL (all FKs to auth.users).

CREATE OR REPLACE FUNCTION public.admin_clear_user_references(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  r RECORD;
  col_list text;
  null_list text;
  pass int;
  total_affected int;
BEGIN
  -- 1) storage.objects: clear owner/owner_id (handles both uuid and text)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner') THEN
    UPDATE storage.objects SET owner = NULL WHERE owner = target_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner_id') THEN
    UPDATE storage.objects SET owner_id = NULL WHERE owner_id = target_user_id::text;
  END IF;

  -- 2) Multiple passes: for each FK to auth.users (except auth.* and public.profiles.id), UPDATE or DELETE
  FOR pass IN 1..20 LOOP
    total_affected := 0;
    FOR r IN
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        (
          SELECT string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum))
          FROM pg_attribute a
          WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey) AND NOT a.attisdropped AND a.attnum > 0
        ) AS column_names,
        (
          SELECT bool_and(a.attnotnull)
          FROM pg_attribute a
          WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey) AND NOT a.attisdropped AND a.attnum > 0
        ) AS all_not_null
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_class ref ON ref.oid = con.confrelid
      JOIN pg_namespace refns ON refns.oid = ref.relnamespace
      WHERE con.contype = 'f'
        AND refns.nspname = 'auth'
        AND ref.relname = 'users'
        AND n.nspname IN ('public', 'storage')
        AND NOT (n.nspname = 'public' AND c.relname = 'profiles')
    LOOP
      IF r.schema_name = 'storage' AND r.table_name = 'objects' THEN
        CONTINUE; -- already handled above
      END IF;

      IF r.all_not_null THEN
        -- Single column: DELETE FROM t WHERE col = target_user_id (multi-column FKs to auth.users are rare)
        BEGIN
          EXECUTE format(
            'DELETE FROM %I.%I WHERE (%s) = $1',
            r.schema_name,
            r.table_name,
            r.column_names
          ) USING target_user_id;
          GET DIAGNOSTICS total_affected = ROW_COUNT;
        EXCEPTION WHEN OTHERS THEN
          -- e.g. FK from another table: skip this pass
          NULL;
        END;
      ELSE
        -- Nullable: SET column = NULL (single column only)
        BEGIN
          IF (SELECT count(*) FROM unnest(string_to_array(r.column_names, ', ')) x) = 1 THEN
            EXECUTE format(
              'UPDATE %I.%I SET %s = NULL WHERE %s = $1',
              r.schema_name,
              r.table_name,
              quote_ident(trim(r.column_names)),
              quote_ident(trim(r.column_names))
            ) USING target_user_id;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END LOOP;
  END LOOP;

  -- 3) Nullable refs we might have missed (explicit list)
  UPDATE public.account_deletion_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.profile_identity_update_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.id_verification_submissions SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.profession_requests SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.lead_issues SET resolved_by = NULL WHERE resolved_by = target_user_id;
  UPDATE public.specialty_requests SET approved_by = NULL WHERE approved_by = target_user_id;
  UPDATE public.manual_test_results SET tester_id = NULL WHERE tester_id = target_user_id;
  UPDATE public.keyword_suggestion_requests SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE public.gig_email_delivery_settings SET updated_by = NULL WHERE updated_by = target_user_id;
  UPDATE public.bids SET awarded_by = NULL WHERE awarded_by = target_user_id;
  UPDATE public.disputes SET resolved_by_user_id = NULL WHERE resolved_by_user_id = target_user_id;
END $$;

COMMENT ON FUNCTION public.admin_clear_user_references(uuid) IS
  'Clears all references to the user (storage + public) so auth.admin.deleteUser can succeed.';
