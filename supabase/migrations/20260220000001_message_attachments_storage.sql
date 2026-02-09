-- Storage bucket for message attachments (images, PDFs, docs, etc.). Private so access is via RLS/signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  25 * 1024 * 1024,  -- 25 MB per file
  null               -- allow all types
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 25 * 1024 * 1024,
  allowed_mime_types = null;

-- Path format: {conversation_id}/{sender_id}/{unique_id}_{filename}
-- So participants in the conversation can read, and only sender can upload to their segment.

-- Helper: check if user can access a message-attachment path (conversation_id is first segment).
CREATE OR REPLACE FUNCTION public.can_access_message_attachment_path(_user_id uuid, _path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  conv_id := (regexp_split_to_array(trim(_path), '/'))[1]::uuid;
  RETURN public.can_access_conversation(_user_id, conv_id);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- SELECT: conversation participants can view attachments in that conversation.
CREATE POLICY "Conversation participants can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND public.can_access_message_attachment_path(auth.uid(), name)
);

-- INSERT: authenticated users can upload to path conversation_id/their_user_id/...
CREATE POLICY "Users can upload message attachments to their conversations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (regexp_split_to_array(trim(name), '/'))[2] = auth.uid()::text
  AND public.can_access_message_attachment_path(auth.uid(), name)
);

-- DELETE: allow sender to delete their own files (path contains their user_id as second segment)
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (regexp_split_to_array(trim(name), '/'))[2] = auth.uid()::text
);
