import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_AWAY_AFTER_MINUTES = 3;

export function usePresenceAwayMinutes() {
  const [awayAfterMinutes, setAwayAfterMinutes] = useState<number>(DEFAULT_AWAY_AFTER_MINUTES);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "presence_settings")
          .maybeSingle();

        if (error || !mounted) return;
        const raw = (data?.value as { away_after_minutes?: unknown } | null)?.away_after_minutes;
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 30) {
          setAwayAfterMinutes(Math.round(numeric));
        }
      } catch {
        // fallback to default silently
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return awayAfterMinutes;
}

export function usePresenceAwayMs() {
  const minutes = usePresenceAwayMinutes();
  return minutes * 60 * 1000;
}
