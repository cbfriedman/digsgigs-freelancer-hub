-- CRM Feature: RLS Policies and Storage Setup
-- This migration assumes tables (clients, projects, interactions, crm_audit_log)
-- were created via Lovable Cloud. This adds RLS policies, indexes, triggers, and storage.
-- Only runs when all four CRM tables exist (no-op on projects that don't use CRM).

-- Enable RLS on all CRM tables (if not already enabled)
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crm_audit_log ENABLE ROW LEVEL SECURITY;

DO $mig$
DECLARE
  tbl_count int;
BEGIN
  SELECT count(*) INTO tbl_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('clients', 'projects', 'interactions', 'crm_audit_log');
  IF tbl_count <> 4 THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- RLS POLICIES FOR CLIENTS TABLE
  -- ============================================================================
  CREATE POLICY "Users can view own clients"
    ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());

  CREATE POLICY "Users can insert own clients"
    ON public.clients FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can update own clients"
    ON public.clients FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can delete own clients"
    ON public.clients FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- ============================================================================
  -- RLS POLICIES FOR PROJECTS TABLE
  -- ============================================================================
  CREATE OR REPLACE FUNCTION public.user_owns_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE client_id = _client_id
      AND user_id = _user_id
  )
$$;

-- Users can view projects for their own clients
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (public.user_owns_client(auth.uid(), client_id));

-- Users can insert projects for their own clients
CREATE POLICY "Users can insert own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_owns_client(auth.uid(), client_id));

-- Users can update projects for their own clients
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (public.user_owns_client(auth.uid(), client_id))
  WITH CHECK (public.user_owns_client(auth.uid(), client_id));

-- Users can delete projects for their own clients
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (public.user_owns_client(auth.uid(), client_id));

-- ============================================================================
-- RLS POLICIES FOR INTERACTIONS TABLE
-- ============================================================================

-- Security definer function to check if user owns the project for an interaction
CREATE OR REPLACE FUNCTION public.user_owns_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    INNER JOIN public.clients c ON p.client_id = c.client_id
    WHERE p.project_id = _project_id
      AND c.user_id = _user_id
  )
$$;

-- Users can view interactions for their own projects
CREATE POLICY "Users can view own interactions"
  ON public.interactions
  FOR SELECT
  TO authenticated
  USING (public.user_owns_project(auth.uid(), project_id));

-- Users can insert interactions for their own projects
CREATE POLICY "Users can insert own interactions"
  ON public.interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_owns_project(auth.uid(), project_id)
    AND created_by = auth.uid()
  );

-- Users can update interactions for their own projects
CREATE POLICY "Users can update own interactions"
  ON public.interactions
  FOR UPDATE
  TO authenticated
  USING (public.user_owns_project(auth.uid(), project_id))
  WITH CHECK (public.user_owns_project(auth.uid(), project_id));

-- Users can delete interactions for their own projects
CREATE POLICY "Users can delete own interactions"
  ON public.interactions
  FOR DELETE
  TO authenticated
  USING (public.user_owns_project(auth.uid(), project_id));

-- ============================================================================
-- RLS POLICIES FOR AUDIT LOG TABLE
-- ============================================================================

-- Users can only view their own audit log entries
CREATE POLICY "Users can view own audit logs"
  ON public.crm_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs"
  ON public.crm_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Clients table indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Interactions table indexes
CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON public.interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON public.interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON public.interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_created_by ON public.interactions(created_by);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_crm_audit_log_user_id ON public.crm_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_log_table_name ON public.crm_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_crm_audit_log_deleted_at ON public.crm_audit_log(deleted_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT AND AUDIT LOGGING
-- ============================================================================

-- Function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clients updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log deletes to audit table
CREATE OR REPLACE FUNCTION public.log_crm_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.crm_audit_log (
    table_name,
    record_id,
    user_id,
    action,
    deleted_data,
    deleted_at
  ) VALUES (
    TG_TABLE_NAME,
    OLD.client_id, -- Will be different for each table, but we'll handle in trigger
    auth.uid(),
    'delete',
    to_jsonb(OLD),
    now()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for clients
DROP TRIGGER IF EXISTS audit_clients_delete ON public.clients;
CREATE TRIGGER audit_clients_delete
  AFTER DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_delete();

-- Audit trigger for projects (need to adjust function to get correct ID)
CREATE OR REPLACE FUNCTION public.log_crm_delete_projects()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.crm_audit_log (
    table_name,
    record_id,
    user_id,
    action,
    deleted_data,
    deleted_at
  ) VALUES (
    'projects',
    OLD.project_id,
    auth.uid(),
    'delete',
    to_jsonb(OLD),
    now()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_projects_delete ON public.projects;
CREATE TRIGGER audit_projects_delete
  AFTER DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_delete_projects();

-- Audit trigger for interactions
CREATE OR REPLACE FUNCTION public.log_crm_delete_interactions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.crm_audit_log (
    table_name,
    record_id,
    user_id,
    action,
    deleted_data,
    deleted_at
  ) VALUES (
    'interactions',
    OLD.interaction_id,
    auth.uid(),
    'delete',
    to_jsonb(OLD),
    now()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_interactions_delete ON public.interactions;
CREATE TRIGGER audit_interactions_delete
  AFTER DELETE ON public.interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_delete_interactions();

-- ============================================================================
-- STORAGE BUCKET FOR CRM FILES
-- ============================================================================

-- Create private storage bucket for CRM files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-files',
  'crm-files',
  false, -- Private bucket
  20971520, -- 20MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for CRM files
-- Users can only access files in their own user_id folder
CREATE POLICY "Users can upload CRM files to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'crm-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view CRM files in own folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update CRM files in own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete CRM files in own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.clients IS 'CRM: Client contacts owned by freelancers';
COMMENT ON TABLE public.projects IS 'CRM: Projects associated with clients';
COMMENT ON TABLE public.interactions IS 'CRM: Messages, notes, calls, and files for projects';
COMMENT ON TABLE public.crm_audit_log IS 'CRM: Audit log for deleted records';

COMMENT ON FUNCTION public.user_owns_client IS 'Security definer function to check client ownership';
COMMENT ON FUNCTION public.user_owns_project IS 'Security definer function to check project ownership via client';

END $mig$;
