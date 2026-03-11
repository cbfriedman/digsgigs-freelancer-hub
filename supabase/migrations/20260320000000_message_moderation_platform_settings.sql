-- Admin-configurable message moderation sensitivity. Stored in platform_settings.
-- Used by moderate-and-send-message Edge Function to reduce false blocks on general wording.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'message_moderation',
  '{"threshold_block": 85, "threshold_flag": 40, "block_on_contact_keywords": true}'::jsonb,
  'Message moderation sensitivity: threshold_block (50-99, default 85 = block when score >= this), threshold_flag (20-80, default 40 = flag when score >= this), block_on_contact_keywords (true = block on phrases like "text me"/"call me"; false = only add to score so general wording is less likely blocked).'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

-- Do not overwrite value on conflict so existing admin edits are preserved.
