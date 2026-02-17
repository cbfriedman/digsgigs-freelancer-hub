/**
 * Canonical profile URL convention:
 * - Digger: /profile/{handle}/digger (handle-based). Fallback: /digger/{id} when no handle.
 * - Gigger: /gigger/{userId} (id = auth user id).
 */

export const normalizeHandle = (handle?: string | null): string | null => {
  const value = handle?.replace(/^@/, "").trim().toLowerCase();
  return value || null;
};

/** Canonical Digger profile URL. Prefer handle when available for SEO and shareability. */
export const getCanonicalDiggerProfilePath = ({
  handle,
  diggerId,
}: {
  handle?: string | null;
  diggerId?: string | null;
}): string | null => {
  const normalized = normalizeHandle(handle);
  if (normalized) return `/profile/${normalized}/digger`;
  if (diggerId) return `/digger/${diggerId}`;
  return null;
};

/** Canonical Gigger profile URL. Uses user id. */
export const getCanonicalGiggerProfilePath = (userId: string): string => {
  return `/gigger/${userId}`;
};
