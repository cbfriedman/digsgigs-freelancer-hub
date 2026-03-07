const DEFAULT_PUBLIC_APP_URL = "https://digsandgigs.com";

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && !isLocalHostname(url.hostname)) {
      url.protocol = "https:";
    }
    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Build a stable auth redirect URL.
 * Prefer a configured public URL to avoid preview/local origins in auth emails.
 */
export function getAuthRedirectUrl(path: string): string {
  const configuredOrigin =
    normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL ?? "") ||
    normalizeOrigin(import.meta.env.VITE_SITE_URL ?? "");
  const runtimeOrigin =
    typeof window !== "undefined" ? normalizeOrigin(window.location.origin) : null;
  const base = configuredOrigin || runtimeOrigin || DEFAULT_PUBLIC_APP_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
