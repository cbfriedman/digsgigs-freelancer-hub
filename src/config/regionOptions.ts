/**
 * Region and country options for Digger (freelancer) location preferences
 * Covers the entire world in 7 distinct regions with country-level granularity
 */

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface RegionOption {
  value: string;
  label: string;
  description: string;
  countries: CountryOption[];
}

export const REGION_OPTIONS: RegionOption[] = [
  {
    value: 'north_america',
    label: 'North America',
    description: 'USA, Canada, Mexico',
    countries: [
      { code: 'US', name: 'United States', flag: '🇺🇸' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦' },
      { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    ],
  },
  {
    value: 'central_south_america',
    label: 'Central & South America',
    description: 'Central America, Caribbean, South America',
    countries: [
      { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
      { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
      { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
      { code: 'CL', name: 'Chile', flag: '🇨🇱' },
      { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
      { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
      { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
      { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
      { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
      { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
      { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
      { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
      { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
      { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
      { code: 'PA', name: 'Panama', flag: '🇵🇦' },
      { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
      { code: 'PE', name: 'Peru', flag: '🇵🇪' },
      { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
      { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
      { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
      { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    ],
  },
  {
    value: 'europe',
    label: 'Europe',
    description: 'Western, Eastern, Northern & Southern Europe',
    countries: [
      { code: 'AT', name: 'Austria', flag: '🇦🇹' },
      { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
      { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
      { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
      { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
      { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
      { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
      { code: 'FI', name: 'Finland', flag: '🇫🇮' },
      { code: 'FR', name: 'France', flag: '🇫🇷' },
      { code: 'DE', name: 'Germany', flag: '🇩🇪' },
      { code: 'GR', name: 'Greece', flag: '🇬🇷' },
      { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
      { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
      { code: 'IT', name: 'Italy', flag: '🇮🇹' },
      { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
      { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
      { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
      { code: 'NO', name: 'Norway', flag: '🇳🇴' },
      { code: 'PL', name: 'Poland', flag: '🇵🇱' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
      { code: 'RO', name: 'Romania', flag: '🇷🇴' },
      { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
      { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
      { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
      { code: 'ES', name: 'Spain', flag: '🇪🇸' },
      { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
      { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
      { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    ],
  },
  {
    value: 'africa',
    label: 'Africa',
    description: 'All African nations',
    countries: [
      { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
      { code: 'AO', name: 'Angola', flag: '🇦🇴' },
      { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
      { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
      { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
      { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
      { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
      { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
      { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
      { code: 'LY', name: 'Libya', flag: '🇱🇾' },
      { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
      { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
      { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
      { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
      { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
      { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
      { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
      { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
      { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
      { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
      { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
      { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
    ],
  },
  {
    value: 'asia',
    label: 'Asia',
    description: 'East, Southeast, South & Central Asia',
    countries: [
      { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
      { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
      { code: 'CN', name: 'China', flag: '🇨🇳' },
      { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
      { code: 'IN', name: 'India', flag: '🇮🇳' },
      { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
      { code: 'JP', name: 'Japan', flag: '🇯🇵' },
      { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
      { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
      { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
      { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
      { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
      { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
      { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
      { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
      { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
      { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
      { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
      { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
      { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
      { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    ],
  },
  {
    value: 'middle_east',
    label: 'Middle East',
    description: 'Arabian Peninsula, Levant, Iran, Turkey',
    countries: [
      { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
      { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
      { code: 'IR', name: 'Iran', flag: '🇮🇷' },
      { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
      { code: 'IL', name: 'Israel', flag: '🇮🇱' },
      { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
      { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
      { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
      { code: 'OM', name: 'Oman', flag: '🇴🇲' },
      { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
      { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
      { code: 'SY', name: 'Syria', flag: '🇸🇾' },
      { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
      { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
      { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
    ],
  },
  {
    value: 'oceania',
    label: 'Oceania',
    description: 'Australia, New Zealand, Pacific Islands',
    countries: [
      { code: 'AU', name: 'Australia', flag: '🇦🇺' },
      { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
      { code: 'GU', name: 'Guam', flag: '🇬🇺' },
      { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
      { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
      { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
    ],
  },
];

export const ALL_REGIONS_VALUE = 'all';

/**
 * Get all country codes for a region
 */
export const getCountryCodesForRegion = (regionValue: string): string[] => {
  const region = REGION_OPTIONS.find(r => r.value === regionValue);
  return region ? region.countries.map(c => c.code) : [];
};

/**
 * Get region value for a country code
 */
export const getRegionForCountry = (countryCode: string): string | null => {
  for (const region of REGION_OPTIONS) {
    if (region.countries.some(c => c.code === countryCode)) {
      return region.value;
    }
  }
  return null;
};

/**
 * Get country name from code
 */
export const getCountryName = (code: string): string | null => {
  for (const region of REGION_OPTIONS) {
    const country = region.countries.find(c => c.code === code);
    if (country) return country.name;
  }
  return null;
};

/** All countries flattened for poster-country dropdown (name for display/store). */
export const ALL_COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = REGION_OPTIONS.flatMap((r) =>
  r.countries.map((c) => ({ code: c.code, name: c.name, flag: c.flag }))
).sort((a, b) => a.name.localeCompare(b.name));

/** Normalize for lookup: trim and lowercase. */
function normalizeCountryKey(s: string): string {
  return s.trim().toLowerCase();
}

/** Find country by name or by 2-letter code (case-insensitive, trimmed). */
export function findCountryByNameOrCode(value: string): { code: string; name: string; flag: string } | undefined {
  if (!value || !value.trim()) return undefined;
  const key = normalizeCountryKey(value);
  return ALL_COUNTRY_OPTIONS.find(
    (x) => normalizeCountryKey(x.name) === key || normalizeCountryKey(x.code) === key
  );
}

/** Convert any ISO 3166-1 alpha-2 country code to its Unicode flag emoji (e.g. "US" -> "🇺🇸"). */
export function countryCodeToFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

/** Flag emoji for a country name or code. Uses region list first, then Unicode for any 2-letter code. */
export const getFlagForCountryName = (countryName: string): string => {
  const c = findCountryByNameOrCode(countryName);
  if (c?.flag) return c.flag;
  const code = (countryName?.trim().length === 2 ? countryName.trim().toUpperCase() : "") || (c?.code ?? "");
  return code ? countryCodeToFlagEmoji(code) : "";
};

/** Two-letter country code for a country name (e.g. "United States" -> "US"). Returns empty string if not found. */
export const getCodeForCountryName = (countryName: string): string => {
  const c = findCountryByNameOrCode(countryName);
  return c?.code ?? "";
};

/**
 * Format selected values for display (handles both region codes and country codes)
 */
export const formatSelectionDisplay = (values: string[] | null): string => {
  if (!values || values.length === 0) return 'All Regions';
  
  // Check if all countries in any region are selected
  const regionSelections: string[] = [];
  const individualCountries: string[] = [];
  
  for (const region of REGION_OPTIONS) {
    const regionCountryCodes = region.countries.map(c => c.code);
    const selectedFromRegion = values.filter(v => regionCountryCodes.includes(v));
    
    if (selectedFromRegion.length === regionCountryCodes.length) {
      // All countries in this region are selected
      regionSelections.push(region.label);
    } else if (selectedFromRegion.length > 0) {
      // Some countries selected
      individualCountries.push(...selectedFromRegion.map(code => {
        const country = region.countries.find(c => c.code === code);
        return country ? country.name : code;
      }));
    }
  }
  
  const parts = [...regionSelections, ...individualCountries];
  
  if (parts.length === 0) return 'All Regions';
  if (parts.length <= 3) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} +${parts.length - 2} more`;
};

/**
 * Check if entire region is selected
 */
export const isRegionFullySelected = (regionValue: string, selectedValues: string[]): boolean => {
  const region = REGION_OPTIONS.find(r => r.value === regionValue);
  if (!region) return false;
  
  const regionCountryCodes = region.countries.map(c => c.code);
  return regionCountryCodes.every(code => selectedValues.includes(code));
};

/**
 * Check if region is partially selected
 */
export const isRegionPartiallySelected = (regionValue: string, selectedValues: string[]): boolean => {
  const region = REGION_OPTIONS.find(r => r.value === regionValue);
  if (!region) return false;
  
  const regionCountryCodes = region.countries.map(c => c.code);
  const selectedCount = regionCountryCodes.filter(code => selectedValues.includes(code)).length;
  return selectedCount > 0 && selectedCount < regionCountryCodes.length;
};
