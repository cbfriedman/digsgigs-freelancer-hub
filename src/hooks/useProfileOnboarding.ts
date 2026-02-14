import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingRolePath = "digger_first" | "gigger_first" | "both" | null;

export interface ProfileOnboardingState {
  user_id: string;
  shared_complete: boolean;
  digger_complete: boolean;
  gigger_complete: boolean;
  role_path: OnboardingRolePath;
  last_step: string | null;
  updated_at: string;
}

type UpsertArgs = {
  shared_complete?: boolean | null;
  digger_complete?: boolean | null;
  gigger_complete?: boolean | null;
  role_path?: OnboardingRolePath;
  last_step?: string | null;
};

export function useProfileOnboarding(enabled: boolean) {
  const [state, setState] = useState<ProfileOnboardingState | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("get_my_profile_onboarding");
      if (error) throw error;
      setState(((data as ProfileOnboardingState[] | null) || [])[0] || null);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const upsert = useCallback(
    async (args: UpsertArgs): Promise<ProfileOnboardingState | null> => {
      if (!enabled) return null;
      const { data, error } = await (supabase.rpc as any)("upsert_my_profile_onboarding", {
        _shared_complete: args.shared_complete ?? null,
        _digger_complete: args.digger_complete ?? null,
        _gigger_complete: args.gigger_complete ?? null,
        _role_path: args.role_path ?? null,
        _last_step: args.last_step ?? null,
      });
      if (error) throw error;
      const next = ((data as ProfileOnboardingState[] | null) || [])[0] || null;
      setState(next);
      return next;
    },
    [enabled]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, loading, refresh, upsert };
}
