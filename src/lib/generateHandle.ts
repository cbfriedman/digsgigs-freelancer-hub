/**
 * Generates a handle from real name. Format: firstname_lastname (e.g. jackson_chen).
 * Lowercase, spaces → underscores, removes special chars. Min 3 chars.
 */
export function generateHandleFromRealName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return fallbackRandomHandle();
  const normalized = fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (normalized.length < 3) return fallbackRandomHandle();
  return normalized.slice(0, 32);
}

/** Fallback when no valid name: d + 10 random chars */
function fallbackRandomHandle(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "d";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generates a unique handle for digger profiles.
 * First profile: jackson_chen from real name (or fallback).
 * Additional profiles: jackson_chen_2, jackson_chen_3, etc. for uniqueness.
 * @param baseHandle - Base handle (e.g. jackson_chen from first profile or real name)
 * @param existingHandles - Handles already in use (globally - from digger_profiles)
 */
export function ensureUniqueHandle(
  baseHandle: string,
  existingHandles: string[] = []
): string {
  const base = baseHandle.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32) || "user";
  const used = new Set(existingHandles.map((h) => h.toLowerCase()));

  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return base + "_" + Date.now().toString(36);
}

/**
 * Generates handle for first profile from real name.
 * Checks existing handles in DB for global uniqueness.
 */
export function getHandleForFirstProfile(
  fullName: string | null | undefined,
  existingHandles: string[] = []
): string {
  const base = generateHandleFromRealName(fullName);
  return ensureUniqueHandle(base, existingHandles);
}

/**
 * Generates handle for additional profile from first profile's handle.
 * Same user identity base + suffix for uniqueness.
 */
export function getHandleForAdditionalProfile(
  firstProfileHandle: string,
  existingHandles: string[] = []
): string {
  const base = firstProfileHandle.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 28);
  return ensureUniqueHandle(base, existingHandles);
}

/** @deprecated Use getHandleForFirstProfile or getHandleForAdditionalProfile. Kept for backward compat. */
export function generateUniqueHandle(): string {
  return fallbackRandomHandle();
}
