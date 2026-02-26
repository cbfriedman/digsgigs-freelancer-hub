-- Revoke direct send_message from authenticated users.
-- Run this AFTER deploying the moderate-and-send-message Edge Function and
-- updating the frontend to call it. Otherwise message sending will break.

REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text, jsonb) FROM authenticated;

COMMENT ON FUNCTION public.send_message(uuid, text, jsonb) IS
  'DEPRECATED: Use moderate-and-send-message Edge Function. Revoked from authenticated.';
