-- Message Moderation System Schema
-- Production-grade moderation for marketplace private messaging.
-- All moderation decisions are server-side only; clients cannot bypass.

-- =============================================================================
-- 1. Extend messages table for moderation support
-- =============================================================================
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS content_normalized TEXT,
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'allowed' CHECK (moderation_status IN ('allowed', 'blocked', 'flagged', 'shadow_blocked')),
ADD COLUMN IF NOT EXISTS visible_to_sender BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_to_recipient BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.messages.content_normalized IS 'Normalized content used for moderation (stored for audit)';
COMMENT ON COLUMN public.messages.moderation_status IS 'allowed | blocked | flagged | shadow_blocked';
COMMENT ON COLUMN public.messages.visible_to_sender IS 'Whether sender can see this message (false for shadow_blocked)';
COMMENT ON COLUMN public.messages.visible_to_recipient IS 'Whether recipient can see this message';
COMMENT ON COLUMN public.messages.recipient_id IS 'Recipient user_id for moderation context';

CREATE INDEX IF NOT EXISTS idx_messages_moderation_status ON public.messages(moderation_status) WHERE moderation_status != 'allowed';
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);

-- =============================================================================
-- 2. message_moderation_events - audit log of all moderation decisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.message_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'flag', 'block', 'shadow_block')),
  total_score INTEGER NOT NULL DEFAULT 0,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  detector_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.message_moderation_events IS 'Audit log of moderation decisions. Only server-side code can insert.';

ALTER TABLE public.message_moderation_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view moderation events
CREATE POLICY "Admins can view moderation events"
  ON public.message_moderation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated users - only service role (Edge Function)
-- Service role bypasses RLS
CREATE POLICY "Service role only insert moderation events"
  ON public.message_moderation_events FOR INSERT
  WITH CHECK (false);
-- Revoke so normal users cannot insert; Edge Function uses service role
ALTER TABLE public.message_moderation_events FORCE ROW LEVEL SECURITY;

-- Allow service role to insert (bypasses RLS when using service_role key)
-- Policy above blocks authenticated; we need a way for Edge Function to insert.
-- Edge Functions with service role bypass RLS entirely, so we're good.
-- For anon/authenticated: no policy = no access. We want INSERT only from service role.
-- Drop the blocking policy and use: no INSERT policy for authenticated = deny.
-- Actually: WITH CHECK (false) means no one can insert via RLS. But service role bypasses RLS!
-- So we're good: authenticated users get denied, service role bypasses.

DROP POLICY IF EXISTS "Service role only insert moderation events" ON public.message_moderation_events;
-- Don't create INSERT policy - only service role (bypasses RLS) can insert
-- For authenticated: we need to explicitly deny. Without INSERT policy, default is deny.
-- So we're good.

CREATE INDEX IF NOT EXISTS idx_moderation_events_message ON public.message_moderation_events(message_id);
CREATE INDEX IF NOT EXISTS idx_moderation_events_user ON public.message_moderation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_events_decision ON public.message_moderation_events(decision);
CREATE INDEX IF NOT EXISTS idx_moderation_events_created ON public.message_moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_conversation ON public.message_moderation_events(conversation_id);

-- =============================================================================
-- 3. user_moderation_profile - per-user violation tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_moderation_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_points INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  muted_until TIMESTAMPTZ,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  last_violation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_moderation_profile IS 'Per-user moderation state for escalation (warn, mute, ban)';

ALTER TABLE public.user_moderation_profile ENABLE ROW LEVEL SECURITY;

-- Users can view own profile (read-only for display)
CREATE POLICY "Users can view own moderation profile"
  ON public.user_moderation_profile FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can update (mute, ban, etc.)
CREATE POLICY "Admins can update moderation profiles"
  ON public.user_moderation_profile FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  );

-- Insert: service role only (Edge Function creates on first violation)
CREATE POLICY "Service role inserts moderation profile"
  ON public.user_moderation_profile FOR INSERT
  WITH CHECK (false);
-- Service role bypasses RLS for INSERT

CREATE INDEX IF NOT EXISTS idx_user_moderation_muted ON public.user_moderation_profile(muted_until) WHERE muted_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_moderation_banned ON public.user_moderation_profile(is_banned) WHERE is_banned = true;

-- =============================================================================
-- 4. moderation_rules - configurable detection rules (optional, for extensibility)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  score INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.moderation_rules IS 'Configurable regex/keyword rules for restricted content';

ALTER TABLE public.moderation_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage rules
CREATE POLICY "Admins can manage moderation rules"
  ON public.moderation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  );

-- Authenticated users can read enabled rules (for client-side pre-check - minimal patterns only)
-- Actually: we should NOT expose rules to client. Keep SELECT admin-only.
DROP POLICY IF EXISTS "Admins can manage moderation rules" ON public.moderation_rules;
CREATE POLICY "Admins can manage moderation rules"
  ON public.moderation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_moderation_rules_category ON public.moderation_rules(category);
CREATE INDEX IF NOT EXISTS idx_moderation_rules_enabled ON public.moderation_rules(enabled) WHERE enabled = true;

-- =============================================================================
-- 5. RPC for Edge Function to insert message (bypasses direct user insert)
-- =============================================================================
-- The Edge Function will use service role to insert. We need an internal RPC
-- that the Edge Function can call, OR the Edge Function inserts directly.
-- Edge Function with service role can INSERT into messages directly.
-- We'll use direct insert from Edge Function.

-- =============================================================================
-- 6. Revoke direct send_message - run AFTER deploying Edge Function + frontend
-- See migration 20260225000002_revoke_send_message.sql
-- =============================================================================

-- =============================================================================
-- 7. Create insert_moderated_message - called only by Edge Function (service role)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.insert_moderated_message(
  _conversation_id uuid,
  _sender_id uuid,
  _content text,
  _content_normalized text,
  _attachments jsonb DEFAULT '[]'::jsonb,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _message_id uuid;
  _partner_id uuid;
BEGIN
  IF NOT public.can_access_conversation(_sender_id, _conversation_id) THEN
    RAISE EXCEPTION 'Sender does not have access to this conversation';
  END IF;

  _partner_id := public.get_conversation_partner_user_id(_conversation_id, _sender_id);
  IF _partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = _partner_id AND blocked_id = _sender_id) THEN
      RAISE EXCEPTION 'You cannot send messages to this conversation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = _sender_id AND blocked_id = _partner_id) THEN
      RAISE EXCEPTION 'You have blocked this user. Unblock to send messages.';
    END IF;
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_id, recipient_id, content, content_normalized,
    moderation_status, visible_to_sender, visible_to_recipient, attachments, metadata
  )
  VALUES (
    _conversation_id, _sender_id, _partner_id, _content, coalesce(_content_normalized, _content),
    'allowed', true, true, coalesce(_attachments, '[]'::jsonb), _metadata
  )
  RETURNING id INTO _message_id;

  RETURN _message_id;
END;
$$;

COMMENT ON FUNCTION public.insert_moderated_message IS 'Inserts a message after passing moderation. Called only by Edge Function with service role.';

-- Grant to service_role only (Edge Function uses service role)
-- Note: In Supabase, functions are called with the role of the caller.
-- When Edge Function uses createClient with service_role key, it has service_role.
GRANT EXECUTE ON FUNCTION public.insert_moderated_message TO service_role;
