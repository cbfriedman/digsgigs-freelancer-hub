const MUTE_KEY = "notification-sound-muted";
let lastNotificationPlayAt = 0;
const MIN_PLAY_GAP_MS = 2000;

// One play per message id (receiver can get same INSERT from multiple subscriptions)
const playedMessageIds = new Set<string>();
const PLAYED_ID_TTL_MS = 5000;

function clearPlayedId(id: string): void {
  playedMessageIds.delete(id);
}

export function isNotificationMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * Play a single, professional notification sound at maximum volume.
 * Pass messageId to ensure the same message never plays twice (e.g. duplicate realtime events).
 */
export function playNotificationSound(messageId?: string): void {
  if (isNotificationMuted()) return;
  const now = Date.now();
  const id = messageId != null ? String(messageId) : undefined;
  if (id) {
    if (playedMessageIds.has(id)) return;
    playedMessageIds.add(id);
    setTimeout(() => clearPlayedId(id), PLAYED_ID_TTL_MS);
  }
  if (now - lastNotificationPlayAt < MIN_PLAY_GAP_MS) return;
  lastNotificationPlayAt = now;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587, t0);
    const duration = 0.35;
    const peakGain = 1; // maximum volume for both client and freelancer
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
    gain.gain.setValueAtTime(peakGain, t0 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration);
  } catch {
    // ignore
  }
}
