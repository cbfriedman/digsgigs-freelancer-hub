"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useCountriesSearch, useRegionsByCountry, useCitiesByLocation } from "@/hooks/useLocations";
import type { CountryRow, RegionRow, CityRow } from "@/hooks/useLocations";

export interface LocationValue {
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
  countryName: string;
  regionName: string;
  cityName: string;
  countryCode: string;
}

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  countryPlaceholder?: string;
  regionPlaceholder?: string;
  regionLabel?: string;
  cityPlaceholder?: string;
  cityLabel?: string;
  className?: string;
}

export function LocationSelector({
  value,
  onChange,
  disabled = false,
  countryPlaceholder = "Select country",
  regionPlaceholder = "Select state/territory",
  regionLabel = "State / Territory",
  cityPlaceholder = "Select city",
  cityLabel = "City",
  className,
}: LocationSelectorProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  const { data: countries = [], isLoading: countriesLoading } = useCountriesSearch(countryQuery);
  const { data: regions = [], isLoading: regionsLoading } = useRegionsByCountry(
    value.countryId,
    regionQuery
  );

  const hasRegions = regions.length > 0;
  const showRegionSelector = value.countryId && (regionsLoading || hasRegions);

  const { data: cities = [], isLoading: citiesLoading } = useCitiesByLocation(
    value.countryId,
    value.regionId || null,
    cityQuery
  );
  const hasCities = cities.length > 0;
  const canSelectCity = value.countryId && (!showRegionSelector || !!value.regionName);
  const showCitySelector = canSelectCity && (citiesLoading || hasCities);

  const handleSelectCountry = (c: CountryRow) => {
    onChange({
      countryId: c.id,
      regionId: null,
      cityId: null,
      countryName: c.name,
      regionName: "",
      cityName: "",
      countryCode: c.code_alpha2,
    });
    setCountryOpen(false);
    setCountryQuery("");
  };

  const handleSelectRegion = (r: RegionRow) => {
    onChange({
      ...value,
      regionId: r.id,
      regionName: r.name,
      cityId: null,
      cityName: "",
    });
    setRegionOpen(false);
    setRegionQuery("");
  };

  const handleSelectCity = (city: CityRow) => {
    onChange({
      ...value,
      cityId: city.id,
      cityName: city.name,
    });
    setCityOpen(false);
    setCityQuery("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <label className="text-sm font-medium mb-1 block">Country</label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              disabled={disabled}
              className="w-full justify-between h-11 font-normal bg-background"
            >
              <span className={cn(!value.countryName && "text-muted-foreground")}>
                {value.countryName || countryPlaceholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0 rounded-md border border-border bg-popover shadow-md"
            align="start"
          >
            <Command shouldFilter={false} className="rounded-lg border-0">
              <CommandInput
                placeholder="Search by country name or code..."
                value={countryQuery}
                onValueChange={setCountryQuery}
                className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <CommandList className="max-h-[280px] py-1">
                <CommandEmpty className="py-4 px-4 text-sm text-muted-foreground">
                  {countriesLoading ? "Loading..." : "No country found."}
                </CommandEmpty>
                <CommandGroup className="p-0">
                  {countries.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.code_alpha2}`}
                      onSelect={() => handleSelectCountry(c)}
                      className="cursor-pointer rounded-sm py-2 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value.countryId === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{c.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {showRegionSelector && (
        <div>
          <label className="text-sm font-medium mb-1 block">{regionLabel}</label>
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionOpen}
                disabled={disabled}
                className="w-full justify-between h-11 font-normal bg-background"
              >
                <span className={cn(!value.regionName && "text-muted-foreground")}>
                  {value.regionName || regionPlaceholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0 rounded-md border border-border bg-popover shadow-md"
              align="start"
            >
              <Command shouldFilter={false} className="rounded-lg border-0">
                <CommandInput
                  placeholder="Search..."
                  value={regionQuery}
                  onValueChange={setRegionQuery}
                  className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <CommandList className="max-h-[280px] py-1">
                  <CommandEmpty className="py-4 px-4 text-sm text-muted-foreground">
                    {regionsLoading ? "Loading..." : "No result found."}
                  </CommandEmpty>
                  <CommandGroup className="p-0">
                    {regions.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.name}
                        onSelect={() => handleSelectRegion(r)}
                        className="cursor-pointer rounded-sm py-2 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value.regionId === r.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{r.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {showCitySelector && (
        <div>
          <label className="text-sm font-medium mb-1 block">{cityLabel}</label>
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={cityOpen}
                disabled={disabled}
                className="w-full justify-between h-11 font-normal bg-background"
              >
                <span className={cn(!value.cityName && "text-muted-foreground")}>
                  {value.cityName || cityPlaceholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0 rounded-md border border-border bg-popover shadow-md"
              align="start"
            >
              <Command shouldFilter={false} className="rounded-lg border-0">
                <CommandInput
                  placeholder="Search city..."
                  value={cityQuery}
                  onValueChange={setCityQuery}
                  className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <CommandList className="max-h-[280px] py-1">
                  <CommandEmpty className="py-4 px-4 text-sm text-muted-foreground">
                    {citiesLoading ? "Loading..." : "No city found."}
                  </CommandEmpty>
                  <CommandGroup className="p-0">
                    {cities.map((city) => (
                      <CommandItem
                        key={city.id}
                        value={city.name}
                        onSelect={() => handleSelectCity(city)}
                        className="cursor-pointer rounded-sm py-2 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value.cityId === city.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{city.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* When country has no regions in DB: allow manual state & city */}
      {value.countryId && !regionsLoading && !hasRegions && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            No state/city data for this country in our system. Enter state and city below so your full location is saved.
          </p>
          <div>
            <label className="text-sm font-medium mb-1 block">{regionLabel}</label>
            <Input
              placeholder="e.g. State or territory"
              value={value.regionName}
              onChange={(e) =>
                onChange({
                  ...value,
                  regionId: null,
                  regionName: e.target.value.trim(),
                })
              }
              disabled={disabled}
              className="h-11 bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{cityLabel}</label>
            <Input
              placeholder="e.g. City name"
              value={value.cityName}
              onChange={(e) =>
                onChange({
                  ...value,
                  cityId: null,
                  cityName: e.target.value.trim(),
                })
              }
              disabled={disabled}
              className="h-11 bg-background"
            />
          </div>
        </div>
      )}

      {/* When state has no cities in DB: allow manual city */}
      {canSelectCity && !citiesLoading && !hasCities && hasRegions && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No cities in the list for this state/region. Enter your city below so your full location is saved.
          </p>
          <div>
            <label className="text-sm font-medium mb-1 block">{cityLabel}</label>
            <Input
              placeholder="e.g. City name"
              value={value.cityName}
              onChange={(e) =>
                onChange({
                  ...value,
                  cityId: null,
                  cityName: e.target.value.trim(),
                })
              }
              disabled={disabled}
              className="h-11 bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
