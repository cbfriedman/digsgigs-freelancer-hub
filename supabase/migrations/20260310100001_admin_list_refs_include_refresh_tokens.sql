-- Include auth.refresh_tokens in diagnostic so we see it in blocking_tables if delete still fails.

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
  -- Auth schema
  SELECT count(*) INTO cnt FROM auth.sessions WHERE user_id = target_user_id;
  IF cnt > 0 THEN schema_name := 'auth'; table_name := 'sessions'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  SELECT count(*) INTO cnt FROM auth.identities WHERE user_id = target_user_id;
  IF cnt > 0 THEN schema_name := 'auth'; table_name := 'identities'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
  BEGIN
    EXECUTE 'SELECT count(*) FROM auth.refresh_tokens WHERE user_id = $1' USING target_user_id INTO cnt;
    IF cnt > 0 THEN schema_name := 'auth'; table_name := 'refresh_tokens'; column_names := 'user_id'; row_count := cnt; RETURN NEXT; END IF;
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

  -- All FKs to auth.users in public
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
      AND n.nspname = 'public'
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
