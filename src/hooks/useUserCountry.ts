import { useState, useEffect } from "react";

const CACHE_KEY = "digs_user_country";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type Cached = {
  countryCode: string;
  countryName: string;
  fetchedAt: number;
};

type Result = {
  countryCode: string | null;
  countryName: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Detects the user's country using IP geolocation (ipapi.co).
 * Result is cached in sessionStorage for 1 hour to limit API calls.
 * Use for locale, Stripe Connect default country, or UI hints—not for strict compliance (IP can be VPN/proxy).
 */
export function useUserCountry(): Result {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fromCache = (): Cached | null => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as Cached;
        if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
        return data;
      } catch {
        return null;
      }
    };

    const saveCache = (code: string, name: string) => {
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            countryCode: code,
            countryName: name,
            fetchedAt: Date.now(),
          } satisfies Cached)
        );
      } catch {
        // ignore
      }
    };

    const fetchCountry = async () => {
      const cached = fromCache();
      if (cached) {
        if (!cancelled) {
          setCountryCode(cached.countryCode);
          setCountryName(cached.countryName);
          setError(null);
        }
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("https://ipapi.co/json/", {
          method: "GET",
          credentials: "omit",
        });
        if (!res.ok) throw new Error(`Geolocation failed: ${res.status}`);
        const data = (await res.json()) as {
          country_code?: string;
          country_name?: string;
          error?: boolean;
          reason?: string;
        };
        if (data.error && data.reason) throw new Error(data.reason);
        const code = (data.country_code ?? "").toUpperCase() || null;
        const name = data.country_name ?? null;
        if (code) saveCache(code, name ?? code);
        if (!cancelled) {
          setCountryCode(code);
          setCountryName(name);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not detect country");
          setCountryCode(null);
          setCountryName(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCountry();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countryCode, countryName, loading, error };
}
