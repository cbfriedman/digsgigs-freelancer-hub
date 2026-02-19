import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CountryRow {
  id: string;
  code_alpha2: string;
  name: string;
}

export interface RegionRow {
  id: string;
  name: string;
  type: string | null;
}

export interface CityRow {
  id: string;
  name: string;
}

const COUNTRIES_QUERY_KEY = "locations-countries";
const REGIONS_QUERY_KEY = "locations-regions";
const CITIES_QUERY_KEY = "locations-cities";

/** Fetch countries with optional name search. Returns all if query is empty. */
export function useCountriesSearch(query: string) {
  return useQuery({
    queryKey: [COUNTRIES_QUERY_KEY, query],
    queryFn: async (): Promise<CountryRow[]> => {
      let q = (supabase
        .from("countries" as any))
        .select("id, code_alpha2, name")
        .order("name");
      const trimmed = query.trim();
      if (trimmed) {
        q = q.or(`name.ilike.%${trimmed}%,code_alpha2.ilike.%${trimmed}%`);
      }
      const { data, error } = await q.limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CountryRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch regions (states/territories) for a country with optional name search. */
export function useRegionsByCountry(countryId: string | null, query: string) {
  return useQuery({
    queryKey: [REGIONS_QUERY_KEY, countryId, query],
    queryFn: async (): Promise<RegionRow[]> => {
      if (!countryId) return [];
      let q = (supabase
        .from("regions" as any))
        .select("id, name, type")
        .eq("country_id", countryId)
        .order("name");
      const trimmed = query.trim();
      if (trimmed) {
        q = q.ilike("name", `%${trimmed}%`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as RegionRow[];
    },
    enabled: !!countryId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch cities for a country, optionally filtered by region, with name search. */
export function useCitiesByLocation(
  countryId: string | null,
  regionId: string | null,
  query: string
) {
  return useQuery({
    queryKey: [CITIES_QUERY_KEY, countryId, regionId, query],
    queryFn: async (): Promise<CityRow[]> => {
      if (!countryId) return [];
      let q = (supabase
        .from("cities" as any))
        .select("id, name")
        .eq("country_id", countryId)
        .order("name");
      if (regionId) {
        q = q.eq("region_id", regionId);
      } else {
        q = q.is("region_id", null);
      }
      const trimmed = query.trim();
      if (trimmed) {
        q = q.ilike("name", `%${trimmed}%`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as CityRow[];
    },
    enabled: !!countryId,
    staleTime: 5 * 60 * 1000,
  });
}
