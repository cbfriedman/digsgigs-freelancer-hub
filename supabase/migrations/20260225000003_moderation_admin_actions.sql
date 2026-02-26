-- Admin moderation actions - RPCs for warn, mute, ban

CREATE OR REPLACE FUNCTION public.admin_warn_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  INSERT INTO public.user_moderation_profile (user_id, warning_count, updated_at)
  VALUES (_target_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    warning_count = public.user_moderation_profile.warning_count + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mute_user(_target_user_id uuid, _until timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  INSERT INTO public.user_moderation_profile (user_id, muted_until, updated_at)
  VALUES (_target_user_id, _until, now())
  ON CONFLICT (user_id) DO UPDATE SET
    muted_until = _until,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  INSERT INTO public.user_moderation_profile (user_id, is_banned, updated_at)
  VALUES (_target_user_id, true, now())
  ON CONFLICT (user_id) DO UPDATE SET
    is_banned = true,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unmute_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE public.user_moderation_profile
  SET muted_until = NULL, updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE public.user_moderation_profile
  SET is_banned = false, updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_warn_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mute_user(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unmute_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
