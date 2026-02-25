-- Storage bucket for milestone work log attachments (screenshots, etc.). Private; access via signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'milestone-work-log-attachments',
  'milestone-work-log-attachments',
  false,
  10 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- Path format: {escrow_contract_id}/{milestone_payment_id}/{unique_id}_{filename}
-- Helper: return escrow_contract_id from path (first segment).
CREATE OR REPLACE FUNCTION public.get_escrow_contract_id_from_work_log_path(_path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (regexp_split_to_array(trim(_path), '/'))[1]::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN null;
END;
$$;

-- Helper: can the current user view work log attachments for this contract (consumer or digger)?
CREATE OR REPLACE FUNCTION public.can_view_milestone_work_log(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract_id uuid;
BEGIN
  _contract_id := public.get_escrow_contract_id_from_work_log_path(_path);
  IF _contract_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.escrow_contracts ec
    WHERE ec.id = _contract_id
      AND (ec.consumer_id = auth.uid() OR ec.digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()))
  );
END;
$$;

-- Helper: can the current user upload (must be the digger of the contract)?
CREATE OR REPLACE FUNCTION public.can_upload_milestone_work_log(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract_id uuid;
BEGIN
  _contract_id := public.get_escrow_contract_id_from_work_log_path(_path);
  IF _contract_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.escrow_contracts ec
    WHERE ec.id = _contract_id
      AND ec.digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  );
END;
$$;

-- SELECT: contract participants can view
CREATE POLICY "Contract participants can view milestone work log attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'milestone-work-log-attachments'
  AND public.can_view_milestone_work_log(name)
);

-- INSERT: only digger of the contract can upload
CREATE POLICY "Digger can upload milestone work log attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'milestone-work-log-attachments'
  AND public.can_upload_milestone_work_log(name)
);
