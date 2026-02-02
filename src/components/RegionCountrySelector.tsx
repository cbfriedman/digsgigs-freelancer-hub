import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, Globe, Minus } from "lucide-react";
import { 
  REGION_OPTIONS, 
  getCountryCodesForRegion, 
  isRegionFullySelected, 
  isRegionPartiallySelected 
} from "@/config/regionOptions";

interface RegionCountrySelectorProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export const RegionCountrySelector = ({ 
  selectedValues, 
  onChange,
  className = ""
}: RegionCountrySelectorProps) => {
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);

  const toggleRegion = (regionValue: string) => {
    setExpandedRegions(prev => 
      prev.includes(regionValue) 
        ? prev.filter(r => r !== regionValue)
        : [...prev, regionValue]
    );
  };

  const handleRegionToggle = (regionValue: string, checked: boolean) => {
    const countryCodes = getCountryCodesForRegion(regionValue);
    
    if (checked) {
      // Add all countries from this region
      const newValues = [...new Set([...selectedValues, ...countryCodes])];
      onChange(newValues);
    } else {
      // Remove all countries from this region
      onChange(selectedValues.filter(v => !countryCodes.includes(v)));
    }
  };

  const handleCountryToggle = (countryCode: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, countryCode]);
    } else {
      onChange(selectedValues.filter(v => v !== countryCode));
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {REGION_OPTIONS.map((region) => {
        const isExpanded = expandedRegions.includes(region.value);
        const isFullySelected = isRegionFullySelected(region.value, selectedValues);
        const isPartiallySelected = isRegionPartiallySelected(region.value, selectedValues);
        const selectedCountInRegion = region.countries.filter(c => 
          selectedValues.includes(c.code)
        ).length;

        return (
          <div key={region.value} className="border rounded-lg overflow-hidden">
            <div 
              className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                isFullySelected 
                  ? 'bg-primary/10 border-primary' 
                  : isPartiallySelected
                  ? 'bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={`region-${region.value}`}
                checked={isFullySelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement).dataset.state = isPartiallySelected && !isFullySelected 
                      ? 'indeterminate' 
                      : isFullySelected ? 'checked' : 'unchecked';
                  }
                }}
                onCheckedChange={(checked) => handleRegionToggle(region.value, checked === true)}
                className="h-5 w-5"
              />
              
              <Collapsible open={isExpanded} onOpenChange={() => toggleRegion(region.value)} className="flex-1">
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{region.label}</span>
                      {selectedCountInRegion > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {selectedCountInRegion}/{region.countries.length}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{region.description}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 mt-3 border-t">
                    {region.countries.map((country) => {
                      const isCountrySelected = selectedValues.includes(country.code);
                      return (
                        <label
                          key={country.code}
                          htmlFor={`country-${country.code}`}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all text-sm ${
                            isCountrySelected 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            id={`country-${country.code}`}
                            checked={isCountrySelected}
                            onCheckedChange={(checked) => handleCountryToggle(country.code, checked === true)}
                            className="h-4 w-4"
                          />
                          <span className="text-base">{country.flag}</span>
                          <span className="truncate">{country.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {isFullySelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
              {isPartiallySelected && !isFullySelected && <Minus className="h-4 w-4 text-primary" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RegionCountrySelector;
