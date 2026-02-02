/**
 * Region options for Digger (freelancer) location preferences
 * Covers the entire world in 7 distinct regions
 */

export interface RegionOption {
  value: string;
  label: string;
  description: string;
}

export const REGION_OPTIONS: RegionOption[] = [
  {
    value: 'north_america',
    label: 'North America',
    description: 'USA, Canada, Mexico',
  },
  {
    value: 'central_south_america',
    label: 'Central & South America',
    description: 'Central America, Caribbean, South America',
  },
  {
    value: 'europe',
    label: 'Europe',
    description: 'Western, Eastern, Northern & Southern Europe',
  },
  {
    value: 'africa',
    label: 'Africa',
    description: 'All African nations',
  },
  {
    value: 'asia',
    label: 'Asia',
    description: 'East, Southeast, South & Central Asia',
  },
  {
    value: 'middle_east',
    label: 'Middle East',
    description: 'Arabian Peninsula, Levant, Iran, Turkey',
  },
  {
    value: 'oceania',
    label: 'Oceania',
    description: 'Australia, New Zealand, Pacific Islands',
  },
];

export const ALL_REGIONS_VALUE = 'all';

/**
 * Get region labels from region values
 */
export const getRegionLabels = (values: string[] | null): string => {
  if (!values || values.length === 0) return 'All Regions';
  if (values.length === REGION_OPTIONS.length) return 'All Regions';
  
  return values
    .map(v => REGION_OPTIONS.find(r => r.value === v)?.label)
    .filter(Boolean)
    .join(', ');
};
