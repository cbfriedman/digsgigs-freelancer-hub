/**
 * Map country name (lowercase) to ISO 3166-1 alpha-2 code for Stripe Connect.
 * Stripe requires a two-letter code; profile may store name (e.g. "United States") or code ("US").
 */
const NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "canada": "CA",
  "mexico": "MX",
  "united kingdom": "GB",
  "uk": "GB",
  "great britain": "GB",
  "argentina": "AR",
  "australia": "AU",
  "austria": "AT",
  "belgium": "BE",
  "brazil": "BR",
  "bulgaria": "BG",
  "chile": "CL",
  "china": "CN",
  "colombia": "CO",
  "costa rica": "CR",
  "croatia": "HR",
  "cyprus": "CY",
  "czech republic": "CZ",
  "denmark": "DK",
  "estonia": "EE",
  "finland": "FI",
  "france": "FR",
  "germany": "DE",
  "greece": "GR",
  "hong kong": "HK",
  "hungary": "HU",
  "india": "IN",
  "indonesia": "ID",
  "ireland": "IE",
  "israel": "IL",
  "italy": "IT",
  "japan": "JP",
  "latvia": "LV",
  "lithuania": "LT",
  "luxembourg": "LU",
  "malaysia": "MY",
  "malta": "MT",
  "netherlands": "NL",
  "new zealand": "NZ",
  "norway": "NO",
  "philippines": "PH",
  "poland": "PL",
  "portugal": "PT",
  "romania": "RO",
  "singapore": "SG",
  "slovakia": "SK",
  "slovenia": "SI",
  "south africa": "ZA",
  "south korea": "KR",
  "spain": "ES",
  "sweden": "SE",
  "switzerland": "CH",
  "thailand": "TH",
  "turkey": "TR",
  "uae": "AE",
  "united arab emirates": "AE",
  "ukraine": "UA",
  "vietnam": "VN",
};

/**
 * Returns a two-letter ISO country code for Stripe, or null if unknown/missing.
 * Accepts either country name (e.g. "United States") or already a 2-letter code (e.g. "US").
 */
export function toStripeCountryCode(value: string | null | undefined): string | null {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const code = NAME_TO_CODE[trimmed.toLowerCase()];
  return code ?? null;
}
