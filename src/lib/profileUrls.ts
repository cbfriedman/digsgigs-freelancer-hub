export const normalizeHandle = (handle?: string | null): string | null => {
  const value = handle?.replace(/^@/, "").trim().toLowerCase();
  return value || null;
};

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
