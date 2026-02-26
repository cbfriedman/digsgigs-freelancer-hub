const MUTE_KEY = "notification-sound-muted";
let lastNotificationPlayAt = 0;
const MIN_PLAY_GAP_MS = 1000;

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
 * Used for new message alerts on both client (gigger) and freelancer (digger) side.
 * Plays globally (GlobalMessageSound) so users hear it even when not on the Messages page.
 * Respects mute state set via the bell icon in the floating message widget.
 */
export function playNotificationSound(): void {
  if (isNotificationMuted()) return;
  const now = Date.now();
  // Global guard: prevent duplicate sound bursts from overlapping listeners/events.
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
