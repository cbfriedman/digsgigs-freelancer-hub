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

export const getLocalTimeForCountry = (countryName: string | null | undefined): string | null => {
  const key = countryName?.trim();
  if (!key) return null;
  const tz =
    countryToTz[key] ??
    Object.entries(countryToTz).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
  if (!tz) return null;
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

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
