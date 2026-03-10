/**
 * Full-page navigation to the sign-in page so Cloudflare challenge runs before the page loads.
 * Use instead of navigate() for "Sign in" / login links.
 */
export function navigateToLogin(options?: { returnTo?: string }): void {
  const params = new URLSearchParams({ mode: "signin" });
  if (options?.returnTo) params.set("returnTo", options.returnTo);
  window.location.href = `/register?${params.toString()}`;
}

/**
 * Full-page navigation to /auth (redirects to register) so Cloudflare challenge runs.
 */
export function navigateToAuth(options?: { redirect?: string }): void {
  const params = options?.redirect ? `?redirect=${encodeURIComponent(options.redirect)}` : "";
  window.location.href = `/auth${params}`;
}
