import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_AWAY_AFTER_MS = 3 * 60 * 1000;

let sharedDiggerChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedDiggerSubscribed = false;
let sharedOnlineDiggers = new Set<string>();
let sharedDiggerLastActiveAt = new Map<string, number>();
let trackedDiggerId: string | null = null;
let sharedDiggerHeartbeat: ReturnType<typeof setInterval> | null = null;
const diggerListeners = new Set<(ids: Set<string>) => void>();
let trackedDiggerLastActiveAt = Date.now();

const publishDiggers = () => {
  const snapshot = new Set(sharedOnlineDiggers);
  diggerListeners.forEach((listener) => listener(snapshot));
};

const parseDiggerState = () => {
  if (!sharedDiggerChannel) return;
  try {
    const state = sharedDiggerChannel.presenceState() ?? {};
    const online = new Set<string>();
    const lastActiveByDigger = new Map<string, number>();
    Object.values(state).forEach((presences: unknown) => {
      const list = Array.isArray(presences)
        ? presences
        : (
            presences &&
            typeof presences === "object" &&
            Array.isArray((presences as { metas?: unknown[] }).metas)
          )
            ? (presences as { metas: unknown[] }).metas
            : [];
      list.forEach((p: unknown) => {
        const row = (p ?? {}) as Record<string, unknown>;
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const raw = row.digger_id ?? payload.digger_id;
        const did = typeof raw === "string" ? raw : raw != null ? String(raw) : null;
        if (did && did.length > 0) {
          online.add(String(did));
          const activeRaw = row.active_at ?? payload.active_at ?? row.online_at ?? payload.online_at;
          const activeAt = activeRaw ? new Date(String(activeRaw)).getTime() : NaN;
          if (!Number.isNaN(activeAt)) {
            const prev = lastActiveByDigger.get(did) ?? 0;
            if (activeAt > prev) lastActiveByDigger.set(did, activeAt);
          }
        }
      });
    });
    sharedOnlineDiggers = online;
    sharedDiggerLastActiveAt = lastActiveByDigger;
    publishDiggers();
  } catch {
    // ignore
  }
};

const trackCurrentDigger = async () => {
  if (!sharedDiggerChannel || !sharedDiggerSubscribed || !trackedDiggerId) return;
  await sharedDiggerChannel.track({
    digger_id: trackedDiggerId,
    active_at: new Date(trackedDiggerLastActiveAt).toISOString(),
    online_at: new Date().toISOString(),
  });
};

const ensureSharedDiggerChannel = async () => {
  if (sharedDiggerChannel) return;
  const presenceKey =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `observer-${Date.now()}-${Math.random()}`;

  sharedDiggerChannel = supabase.channel("digger-presence", {
    config: { presence: { key: presenceKey } },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
  }

  sharedDiggerChannel
    .on("presence", { event: "sync" }, parseDiggerState)
    .on("presence", { event: "join" }, parseDiggerState)
    .on("presence", { event: "leave" }, parseDiggerState)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        sharedDiggerSubscribed = true;
        parseDiggerState();
        setTimeout(parseDiggerState, 200);
        setTimeout(parseDiggerState, 500);
        setTimeout(parseDiggerState, 1200);
        void trackCurrentDigger().catch(() => {});
      }
    });
};

const setTrackedDigger = (diggerId: string | null) => {
  trackedDiggerId = diggerId;
  if (!trackedDiggerId) {
    if (sharedDiggerHeartbeat) {
      clearInterval(sharedDiggerHeartbeat);
      sharedDiggerHeartbeat = null;
    }
    return;
  }
  if (!sharedDiggerHeartbeat) {
    sharedDiggerHeartbeat = setInterval(() => {
      void trackCurrentDigger().catch(() => {});
    }, 20_000);
  }
  trackedDiggerLastActiveAt = Date.now();
  void trackCurrentDigger().catch(() => {});
};

export const useDiggerPresence = (diggerId?: string) => {
  const [onlineDiggers, setOnlineDiggers] = useState<Set<string>>(() => new Set(sharedOnlineDiggers));

  useEffect(() => {
    const listener = (snapshot: Set<string>) => setOnlineDiggers(snapshot);
    diggerListeners.add(listener);
    // Push current shared state to this listener immediately (in case channel already synced)
    listener(new Set(sharedOnlineDiggers));
    // Re-parse from channel and publish so we pick up latest presence (handles late sync)
    parseDiggerState();
    void ensureSharedDiggerChannel();
    // Delayed re-syncs to catch presence that arrives shortly after mount (e.g. GigDetail bid cards)
    const t1 = setTimeout(parseDiggerState, 150);
    const t2 = setTimeout(parseDiggerState, 600);
    const t3 = setTimeout(parseDiggerState, 2000);
    return () => {
      diggerListeners.delete(listener);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return {
    isOnline: diggerId ? onlineDiggers.has(String(diggerId)) : false,
    onlineDiggers,
  };
};

// Hook for tracking current digger's presence globally
export const useTrackDiggerPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    const isRegisterPage = window.location.pathname === "/register";
    if (!user?.id || isRegisterPage) {
      setTrackedDigger(null);
      return;
    }

    const setupPresence = async () => {
      await ensureSharedDiggerChannel();
      try {
        const { data: diggerProfile, error } = await supabase
          .from("digger_profiles")
          .select("id")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          if (
            error.code === "PGRST116" ||
            error.code === "PGRST301" ||
            error.message?.includes("406") ||
            error.message?.includes("Not Acceptable")
          ) {
            setTrackedDigger(null);
            return;
          }
          console.warn("Error fetching digger profile for presence tracking:", error);
          setTrackedDigger(null);
          return;
        }

        setTrackedDigger(diggerProfile?.id ?? null);
      } catch (error) {
        console.warn("Error setting up digger presence:", error);
        setTrackedDigger(null);
      }
    };

    void setupPresence();

    let lastActivitySentAt = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      trackedDiggerLastActiveAt = now;
      if (now - lastActivitySentAt < 15_000) return;
      lastActivitySentAt = now;
      void trackCurrentDigger().catch(() => {});
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "pointerdown",
      "touchstart",
      "scroll",
      "mousemove",
    ];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        trackedDiggerLastActiveAt = Date.now();
        void trackCurrentDigger().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      setTrackedDigger(null);
    };
  }, [user?.id]);
};

export type DiggerPresenceStatus = "online" | "away" | "offline";

export const getDiggerPresenceStatus = (
  diggerId: string | null | undefined,
  awayAfterMs: number = DEFAULT_AWAY_AFTER_MS
): DiggerPresenceStatus => {
  if (!diggerId || !sharedOnlineDiggers.has(String(diggerId))) return "offline";
  const activeAt = sharedDiggerLastActiveAt.get(String(diggerId));
  if (!activeAt) return "online";
  return Date.now() - activeAt > awayAfterMs ? "away" : "online";
};
