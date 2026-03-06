import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const USER_PRESENCE_CHANNEL = "user-presence";
const DEFAULT_AWAY_AFTER_MS = 3 * 60 * 1000;

let sharedUserChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedUserSubscribed = false;
let sharedOnlineUserIds = new Set<string>();
let sharedUserLastActiveAt = new Map<string, number>();
let trackedUserId: string | null = null;
let sharedHeartbeat: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(ids: Set<string>) => void>();
let trackedUserLastActiveAt = Date.now();

const publish = () => {
  const snapshot = new Set(sharedOnlineUserIds);
  listeners.forEach((listener) => listener(snapshot));
};

const parsePresenceState = () => {
  if (!sharedUserChannel) return;
  try {
    const state = sharedUserChannel.presenceState() ?? {};
    const online = new Set<string>();
    const lastActiveByUser = new Map<string, number>();
    Object.entries(state).forEach(([presenceKey, presences]) => {
      const list = Array.isArray(presences)
        ? presences
        : (
            presences &&
            typeof presences === "object" &&
            Array.isArray((presences as { metas?: unknown[] }).metas)
          )
            ? (presences as { metas: unknown[] }).metas
            : [];

      if (list.length === 0 && presenceKey) {
        online.add(String(presenceKey));
      }

      list.forEach((p: unknown) => {
        const row = (p ?? {}) as Record<string, unknown>;
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const raw = row.user_id ?? payload.user_id ?? presenceKey;
        const uid = typeof raw === "string" ? raw : raw != null ? String(raw) : null;
        if (uid && uid.length > 0) {
          online.add(String(uid));
          const activeRaw = row.active_at ?? payload.active_at ?? row.online_at ?? payload.online_at;
          const activeAt = activeRaw ? new Date(String(activeRaw)).getTime() : NaN;
          if (!Number.isNaN(activeAt)) {
            const prev = lastActiveByUser.get(uid) ?? 0;
            if (activeAt > prev) lastActiveByUser.set(uid, activeAt);
          }
        }
      });
    });
    sharedOnlineUserIds = online;
    sharedUserLastActiveAt = lastActiveByUser;
    publish();
  } catch {
    // ignore
  }
};

const trackCurrentUser = async () => {
  if (!sharedUserChannel || !sharedUserSubscribed || !trackedUserId) return;
  await sharedUserChannel.track({
    user_id: trackedUserId,
    active_at: new Date(trackedUserLastActiveAt).toISOString(),
    online_at: new Date().toISOString(),
  });
};

const ensureSharedUserChannel = async () => {
  if (sharedUserChannel) return;
  const presenceKey =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `observer-${Date.now()}-${Math.random()}`;

  sharedUserChannel = supabase.channel(USER_PRESENCE_CHANNEL, {
    config: { presence: { key: presenceKey } },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
  }

  sharedUserChannel
    .on("presence", { event: "sync" }, parsePresenceState)
    .on("presence", { event: "join" }, parsePresenceState)
    .on("presence", { event: "leave" }, parsePresenceState)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        sharedUserSubscribed = true;
        parsePresenceState();
        setTimeout(parsePresenceState, 200);
        setTimeout(parsePresenceState, 500);
        setTimeout(parsePresenceState, 1200);
        void trackCurrentUser().catch(() => {});
      }
    });
};

const setTrackedUser = (userId: string | null) => {
  trackedUserId = userId;
  if (!trackedUserId) {
    if (sharedHeartbeat) {
      clearInterval(sharedHeartbeat);
      sharedHeartbeat = null;
    }
    return;
  }
  if (!sharedHeartbeat) {
    sharedHeartbeat = setInterval(() => {
      void trackCurrentUser().catch(() => {});
    }, 20_000);
  }
  void trackCurrentUser().catch(() => {});
};

/** Returns the set of user IDs currently online (tracked on user-presence channel). */
export function useUserPresence() {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set(sharedOnlineUserIds));

  useEffect(() => {
    const listener = (snapshot: Set<string>) => setOnlineUserIds(snapshot);
    listeners.add(listener);
    listener(new Set(sharedOnlineUserIds));
    parsePresenceState();
    void ensureSharedUserChannel();
    const t1 = setTimeout(parsePresenceState, 150);
    const t2 = setTimeout(parsePresenceState, 600);
    const t3 = setTimeout(parsePresenceState, 2000);
    return () => {
      listeners.delete(listener);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return { onlineUserIds };
}

/** Tracks the current user's presence so they appear online to others. Call once in app root. */
export function useTrackUserPresence() {
  const { user } = useAuth();

  useEffect(() => {
    const isRegisterPage = window.location.pathname === "/register";
    if (!user?.id || isRegisterPage) {
      setTrackedUser(null);
      return;
    }

    void ensureSharedUserChannel().then(() => {
      trackedUserLastActiveAt = Date.now();
      setTrackedUser(user.id);
    });

    let lastActivitySentAt = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      trackedUserLastActiveAt = now;
      if (now - lastActivitySentAt < 15_000) return;
      lastActivitySentAt = now;
      void trackCurrentUser().catch(() => {});
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
        trackedUserLastActiveAt = Date.now();
        void trackCurrentUser().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      setTrackedUser(null);
    };
  }, [user?.id]);
}

export type PresenceStatus = "online" | "away" | "offline";

export const getUserPresenceStatus = (
  userId: string | null | undefined,
  awayAfterMs: number = DEFAULT_AWAY_AFTER_MS
): PresenceStatus => {
  if (!userId || !sharedOnlineUserIds.has(String(userId))) return "offline";
  const activeAt = sharedUserLastActiveAt.get(String(userId));
  if (!activeAt) return "online";
  return Date.now() - activeAt > awayAfterMs ? "away" : "online";
};
