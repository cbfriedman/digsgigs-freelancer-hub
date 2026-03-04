-- Improve admin user deletion reliability by handling all auth.users FK refs across auth/public/storage.
-- This prevents partial cleanup (roles removed) when hard delete is blocked by newer auth schema tables.

CREATE OR REPLACE FUNCTION public.admin_clear_user_references(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth, pg_catalog
AS $$
DECLARE
  r RECORD;
  pass int;
BEGIN
  -- 0) Auth schema explicit cleanup (best-effort; tables vary by Supabase version)
  BEGIN
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.identities WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = target_user_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.one_time_tokens WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 1) storage.objects owner refs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner') THEN
    UPDATE storage.objects SET owner = NULL WHERE owner = target_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner_id') THEN
    UPDATE storage.objects SET owner_id = NULL WHERE owner_id = target_user_id::text;
  END IF;

  -- 2) Multi-pass generic FK cleanup for refs to auth.users in auth/public/storage
  FOR pass IN 1..20 LOOP
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
        AND n.nspname IN ('public', 'storage', 'auth')
        AND NOT (n.nspname = 'public' AND c.relname = 'profiles')
        AND NOT (n.nspname = 'storage' AND c.relname = 'objects')
        AND NOT (n.nspname = 'auth' AND c.relname = 'users')
    LOOP
      IF r.all_not_null THEN
        BEGIN
          EXECUTE format(
            'DELETE FROM %I.%I WHERE (%s) = $1',
            r.schema_name,
            r.table_name,
            r.column_names
          ) USING target_user_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      ELSE
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
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END LOOP;
  END LOOP;

  -- 3) Explicit refs
  DELETE FROM public.account_deletion_requests WHERE user_id = target_user_id;
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
  'Clears auth/public/storage refs to auth.users (including newer auth tables) so auth.admin.deleteUser can succeed.';

CREATE OR REPLACE FUNCTION public.admin_list_remaining_user_references(target_user_id uuid)
RETURNS TABLE(schema_name text, table_name text, column_names text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, auth, pg_catalog
AS $$
DECLARE
  r RECORD;
  cnt bigint;
BEGIN
  -- Auth schema quick checks
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.sessions WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'sessions'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.identities WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'identities'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.refresh_tokens WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'refresh_tokens'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.mfa_factors WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'mfa_factors'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = $1)' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'mfa_challenges'; column_names := 'factor_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.one_time_tokens WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'one_time_tokens'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- storage.objects
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner') THEN
    EXECUTE 'SELECT count(*) FROM storage.objects WHERE owner = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'storage'; table_name := 'objects'; column_names := 'owner'; row_count := cnt; RETURN NEXT; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner_id') THEN
    EXECUTE 'SELECT count(*) FROM storage.objects WHERE owner_id = $1' USING target_user_id::text INTO cnt;
    IF cnt > 0 THEN schema_name := 'storage'; table_name := 'objects'; column_names := 'owner_id'; row_count := cnt; RETURN NEXT; END IF;
  END IF;

  -- Generic check for remaining FK refs in auth/public/storage
  FOR r IN
    SELECT
      n.nspname AS sch,
      c.relname AS tbl,
      (
        SELECT string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey) AND NOT a.attisdropped AND a.attnum > 0
      ) AS cols
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class ref ON ref.oid = con.confrelid
    JOIN pg_namespace refns ON refns.oid = ref.relnamespace
    WHERE con.contype = 'f'
      AND refns.nspname = 'auth'
      AND ref.relname = 'users'
      AND n.nspname IN ('public', 'auth', 'storage')
      AND NOT (n.nspname = 'auth' AND c.relname = 'users')
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT count(*) FROM %I.%I WHERE (%s) = $1',
        r.sch,
        r.tbl,
        r.cols
      ) USING target_user_id INTO cnt;
      IF cnt > 0 THEN
        schema_name := r.sch; table_name := r.tbl; column_names := r.cols; row_count := cnt; RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.admin_list_remaining_user_references(uuid) IS
  'Returns remaining references to target user across auth/public/storage tables.';
