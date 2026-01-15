/**
 * Shared CORS configuration for edge functions
 * Restricts CORS to allowed origins for security
 */

// Allowed origins - update these for production
const ALLOWED_ORIGINS = [
  "https://digsgigs-freelancer-hub.vercel.app",
  "https://digsandgigs.com",
  "https://www.digsandgigs.com",
  "https://digsandgigs.net",
  "https://www.digsandgigs.net",
  // Development origins
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function isLovablePreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovable.dev");
  } catch {
    return false;
  }
}

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Allow Lovable preview domains so function calls work inside the preview iframe.
  const allowedOrigin =
    (origin && (ALLOWED_ORIGINS.includes(origin) || isLovablePreviewOrigin(origin)))
      ? origin
      : ALLOWED_ORIGINS[0]; // Default to production URL

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleOptionsRequest(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

