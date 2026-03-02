import { getCanonicalDiggerProfilePath } from "@/lib/profileUrls";

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export const formatRealName = (fullName: string | null | undefined): string => {
  if (!fullName?.trim()) return "";
  const names = fullName.trim().split(/\s+/);
  const first = names[0];
  const lastInitial = names.length > 1 ? names[names.length - 1].charAt(0) + "." : "";
  return `${first} ${lastInitial}`.trim();
};

export const formatDisplayName = (
  fullName: string | null | undefined,
  handle: string | null | undefined
): string => {
  const parts: string[] = [];
  if (fullName && fullName.trim()) parts.push(formatRealName(fullName));
  if (handle && handle.trim()) parts.push(`@${handle.replace(/^@/, "")}`);
  return parts.join(" ") || "";
};

export const getDiggerProfileUrl = (d: { id: string; handle?: string | null }) =>
  getCanonicalDiggerProfilePath({ handle: d.handle, diggerId: d.id }) || `/digger/${d.id}`;

export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
};

export const formatEarningsCompact = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "$0";
  if (value >= 1000) {
    const k = value / 1000;
    return k >= 10 ? `$${Math.round(k)}k` : k % 1 === 0 ? `$${k}k` : `$${k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
};

const countryToTz: Record<string, string> = {
  "United States": "America/New_York", US: "America/New_York",
  "Canada": "America/Toronto", CA: "America/Toronto",
  "United Kingdom": "Europe/London", UK: "Europe/London", GB: "Europe/London",
  "Australia": "Australia/Sydney", AU: "Australia/Sydney",
  "Germany": "Europe/Berlin", DE: "Europe/Berlin",
  "France": "Europe/Paris", FR: "Europe/Paris",
  "Spain": "Europe/Madrid", ES: "Europe/Madrid",
  "Italy": "Europe/Rome", IT: "Europe/Rome",
  "Netherlands": "Europe/Amsterdam", NL: "Europe/Amsterdam",
  "India": "Asia/Kolkata", IN: "Asia/Kolkata",
  "Japan": "Asia/Tokyo", JP: "Asia/Tokyo",
  "Brazil": "America/Sao_Paulo", BR: "America/Sao_Paulo",
  "Mexico": "America/Mexico_City", MX: "America/Mexico_City",
  "Philippines": "Asia/Manila", PH: "Asia/Manila",
  "Poland": "Europe/Warsaw", PL: "Europe/Warsaw",
  "Portugal": "Europe/Lisbon", PT: "Europe/Lisbon",
  "Ireland": "Europe/Dublin", IE: "Europe/Dublin",
  "Sweden": "Europe/Stockholm", SE: "Europe/Stockholm",
  "New Zealand": "Pacific/Auckland", NZ: "Pacific/Auckland",
};

// US state/territory → IANA timezone (so local time matches specified location)
const usStateToTz: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
  CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DE: "America/New_York",
  DC: "America/New_York", FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
  ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis", IA: "America/Chicago",
  KS: "America/Chicago", KY: "America/Kentucky/Louisville", LA: "America/Chicago", ME: "America/New_York",
  MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago",
  MS: "America/Chicago", MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago",
  NV: "America/Los_Angeles", NH: "America/New_York", NJ: "America/New_York", NM: "America/Denver",
  NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York",
  OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago",
  UT: "America/Denver", VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles",
  WV: "America/New_York", WI: "America/Chicago", WY: "America/Denver",
  "Alabama": "America/Chicago", "Alaska": "America/Anchorage", "Arizona": "America/Phoenix", "Arkansas": "America/Chicago",
  "California": "America/Los_Angeles", "Colorado": "America/Denver", "Connecticut": "America/New_York", "Delaware": "America/New_York",
  "District of Columbia": "America/New_York", "Florida": "America/New_York", "Georgia": "America/New_York", "Hawaii": "Pacific/Honolulu",
  "Idaho": "America/Boise", "Illinois": "America/Chicago", "Indiana": "America/Indiana/Indianapolis", "Iowa": "America/Chicago",
  "Kansas": "America/Chicago", "Kentucky": "America/Kentucky/Louisville", "Louisiana": "America/Chicago", "Maine": "America/New_York",
  "Maryland": "America/New_York", "Massachusetts": "America/New_York", "Michigan": "America/Detroit", "Minnesota": "America/Chicago",
  "Mississippi": "America/Chicago", "Missouri": "America/Chicago", "Montana": "America/Denver", "Nebraska": "America/Chicago",
  "Nevada": "America/Los_Angeles", "New Hampshire": "America/New_York", "New Jersey": "America/New_York", "New Mexico": "America/Denver",
  "New York": "America/New_York", "North Carolina": "America/New_York", "North Dakota": "America/Chicago", "Ohio": "America/New_York",
  "Oklahoma": "America/Chicago", "Oregon": "America/Los_Angeles", "Pennsylvania": "America/New_York", "Rhode Island": "America/New_York",
  "South Carolina": "America/New_York", "South Dakota": "America/Chicago", "Tennessee": "America/Chicago", "Texas": "America/Chicago",
  "Utah": "America/Denver", "Vermont": "America/New_York", "Virginia": "America/New_York", "Washington": "America/Los_Angeles",
  "West Virginia": "America/New_York", "Wisconsin": "America/Chicago", "Wyoming": "America/Denver",
};

// Canada province → IANA timezone
const caProvinceToTz: Record<string, string> = {
  AB: "America/Edmonton", BC: "America/Vancouver", MB: "America/Winnipeg", NB: "America/Moncton",
  NL: "America/St_Johns", NS: "America/Halifax", NT: "America/Yellowknife", NU: "America/Iqaluit",
  ON: "America/Toronto", PE: "America/Halifax", QC: "America/Montreal", SK: "America/Regina", YT: "America/Whitehorse",
  "Alberta": "America/Edmonton", "British Columbia": "America/Vancouver", "Manitoba": "America/Winnipeg", "New Brunswick": "America/Moncton",
  "Newfoundland and Labrador": "America/St_Johns", "Nova Scotia": "America/Halifax", "Northwest Territories": "America/Yellowknife", "Nunavut": "America/Iqaluit",
  "Ontario": "America/Toronto", "Prince Edward Island": "America/Halifax", "Quebec": "America/Montreal", "Saskatchewan": "America/Regina", "Yukon": "America/Whitehorse",
};

// Australia state/territory → IANA timezone
const auStateToTz: Record<string, string> = {
  NSW: "Australia/Sydney", VIC: "Australia/Melbourne", QLD: "Australia/Brisbane", WA: "Australia/Perth",
  SA: "Australia/Adelaide", TAS: "Australia/Hobart", NT: "Australia/Darwin", ACT: "Australia/Sydney",
  "New South Wales": "Australia/Sydney", "Victoria": "Australia/Melbourne", "Queensland": "Australia/Brisbane", "Western Australia": "Australia/Perth",
  "South Australia": "Australia/Adelaide", "Tasmania": "Australia/Hobart", "Northern Territory": "Australia/Darwin", "Australian Capital Territory": "Australia/Sydney",
};

function normalizeCountryForTz(country: string | null | undefined): string | null {
  const key = country?.trim();
  if (!key) return null;
  return countryToTz[key] ?? Object.keys(countryToTz).find((k) => k.toLowerCase() === key.toLowerCase()) ?? null;
}

function isCountryUsCaAu(countryKey: string | null): boolean {
  if (!countryKey) return false;
  const lower = countryKey.toLowerCase();
  return lower === "united states" || lower === "us" || lower === "usa" || lower === "canada" || lower === "ca" || lower === "australia" || lower === "au";
}

/** Resolve IANA timezone from specified location (country + state/region). Uses state when available for US, Canada, Australia. */
export function getTimezoneForLocation(
  countryName: string | null | undefined,
  stateRegion: string | null | undefined
): string | null {
  const country = countryName?.trim();
  if (!country) return null;

  const countryNorm = countryToTz[country] ?? Object.entries(countryToTz).find(([k]) => k.toLowerCase() === country.toLowerCase())?.[1];
  if (!countryNorm) return null;

  const state = stateRegion?.trim();
  if (state) {
    const countryLower = country.toLowerCase();
    if (countryLower === "united states" || countryLower === "us" || countryLower === "usa") {
      const tz = usStateToTz[state] ?? usStateToTz[state.toUpperCase()] ?? Object.entries(usStateToTz).find(([k]) => k.toLowerCase() === state.toLowerCase())?.[1];
      if (tz) return tz;
    }
    if (countryLower === "canada" || countryLower === "ca") {
      const tz = caProvinceToTz[state] ?? caProvinceToTz[state.toUpperCase()] ?? Object.entries(caProvinceToTz).find(([k]) => k.toLowerCase() === state.toLowerCase())?.[1];
      if (tz) return tz;
    }
    if (countryLower === "australia" || countryLower === "au") {
      const tz = auStateToTz[state] ?? auStateToTz[state.toUpperCase()] ?? Object.entries(auStateToTz).find(([k]) => k.toLowerCase() === state.toLowerCase())?.[1];
      if (tz) return tz;
    }
  }

  return countryNorm;
}

/** Format current time in the timezone for the given location (country + optional state). Uses state for US/CA/AU. */
export function getLocalTimeForLocation(
  countryName: string | null | undefined,
  stateRegion: string | null | undefined
): string | null {
  const tz = getTimezoneForLocation(countryName, stateRegion);
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return null;
  }
}

export const getLocalTimeForCountry = (countryName: string | null | undefined): string | null =>
  getLocalTimeForLocation(countryName, null);

export const formatJoinDate = (createdAt: string | null | undefined): string => {
  if (!createdAt) return "";
  try {
    return new Date(createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};
