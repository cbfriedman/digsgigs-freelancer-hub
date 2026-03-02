import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface DiggerFilters {
  hourlyRateRange: [number, number];
  selectedCategories: string[];
  locationRadius: number;
  locationLat?: number;
  locationLng?: number;
  minRating?: number;
  certifications: string[];
  maxResponseTime?: number;
  availability?: string;
  isInsured?: boolean;
  isBonded?: boolean;
  isLicensed?: boolean;
  offersFreeEstimates?: boolean;
  country?: string;
}

interface DiggerAdvancedFiltersProps {
  categories: Category[];
  filters: DiggerFilters;
  onFiltersChange: (filters: DiggerFilters) => void;
  /** Called after a search is saved so the saved-searches list can refresh without page reload */
  onSavedSearch?: () => void;
}

const COMMON_CERTIFICATIONS = [
  "EPA Certified",
  "OSHA Certified",
  "Licensed Electrician",
  "Licensed Plumber",
  "Licensed HVAC",
  "Certified General Contractor",
  "Master Craftsman",
  "Journeyman",
];

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Mexico",
  "Brazil",
  "India",
  "China",
  "Japan",
  "South Korea",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Ireland",
  "Switzerland",
  "Austria",
  "Belgium",
  "Portugal",
  "Greece",
  "New Zealand",
  "Singapore",
  "South Africa",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Israel",
  "UAE",
  "Saudi Arabia",
  "Turkey",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Indonesia",
  "Malaysia",
  "Egypt",
  "Nigeria",
  "Kenya",
  "Other"
];

export const DiggerAdvancedFilters = ({
  categories,
  filters,
  onFiltersChange,
  onSavedSearch,
}: DiggerAdvancedFiltersProps) => {
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRateChange = (value: number[]) => {
    onFiltersChange({ ...filters, hourlyRateRange: [value[0], value[1]] });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.selectedCategories.includes(categoryId)
      ? filters.selectedCategories.filter(id => id !== categoryId)
      : [...filters.selectedCategories, categoryId];
    onFiltersChange({ ...filters, selectedCategories: newCategories });
  };

  const handleCertificationToggle = (cert: string) => {
    const newCerts = filters.certifications.includes(cert)
      ? filters.certifications.filter(c => c !== cert)
      : [...filters.certifications, cert];
    onFiltersChange({ ...filters, certifications: newCerts });
  };

  const handleLocationRadiusChange = (value: number[]) => {
    onFiltersChange({ ...filters, locationRadius: value[0] });
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error("Please enter a name for your saved search");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save searches");
        return;
      }

      const { error } = await supabase
        .from('saved_searches')
        .insert([{
          user_id: user.id,
          search_type: 'diggers',
          name: searchName,
          filters: filters as any,
          email_alerts_enabled: true
        }]);

      if (error) throw error;

      toast.success("Search saved successfully! You'll receive email alerts for matching professionals.");
      setSearchName("");
      onSavedSearch?.();
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error("Failed to save search");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      hourlyRateRange: [0, 500],
      selectedCategories: [],
      locationRadius: 50,
      certifications: [],
      country: undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Advanced Filters
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hourly Rate Range */}
        <div className="space-y-3">
          <Label>Hourly Rate: ${filters.hourlyRateRange[0]} - ${filters.hourlyRateRange[1]}</Label>
          <Slider
            min={0}
            max={500}
            step={5}
            value={filters.hourlyRateRange}
            onValueChange={handleRateChange}
            className="w-full"
          />
        </div>

        {/* Location Radius */}
        <div className="space-y-3">
          <Label>Location Radius: {filters.locationRadius} miles</Label>
          <Slider
            min={5}
            max={200}
            step={5}
            value={[filters.locationRadius]}
            onValueChange={handleLocationRadiusChange}
            className="w-full"
          />
        </div>

        {/* Rating Filter */}
        <div className="space-y-3">
          <Label>Minimum Rating</Label>
          <Select
            value={filters.minRating?.toString() || "0"}
            onValueChange={(value) => onFiltersChange({ ...filters, minRating: parseFloat(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any rating</SelectItem>
              <SelectItem value="3">3+ stars</SelectItem>
              <SelectItem value="4">4+ stars</SelectItem>
              <SelectItem value="4.5">4.5+ stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Response Time */}
        <div className="space-y-3">
          <Label>Maximum Response Time</Label>
          <Select
            value={filters.maxResponseTime?.toString() || ""}
            onValueChange={(value) => onFiltersChange({ ...filters, maxResponseTime: value ? parseInt(value) : undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any response time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Within 1 hour</SelectItem>
              <SelectItem value="3">Within 3 hours</SelectItem>
              <SelectItem value="12">Within 12 hours</SelectItem>
              <SelectItem value="24">Within 24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Availability */}
        <div className="space-y-3">
          <Label>Availability</Label>
          <Select
            value={filters.availability || ""}
            onValueChange={(value) => onFiltersChange({ ...filters, availability: value || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="this_week">This week</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Country Filter */}
        <div className="space-y-3">
          <Label>Country</Label>
          <Select
            value={filters.country || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, country: value === "all" ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          <Label>Credentials</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insured"
                checked={filters.isInsured || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, isInsured: checked as boolean })}
              />
              <label htmlFor="insured" className="text-sm cursor-pointer">
                Insured
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bonded"
                checked={filters.isBonded || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, isBonded: checked as boolean })}
              />
              <label htmlFor="bonded" className="text-sm cursor-pointer">
                Bonded
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="licensed"
                checked={filters.isLicensed || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, isLicensed: checked as boolean })}
              />
              <label htmlFor="licensed" className="text-sm cursor-pointer">
                Licensed
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-estimates"
                checked={filters.offersFreeEstimates || false}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, offersFreeEstimates: checked as boolean })}
              />
              <label htmlFor="free-estimates" className="text-sm cursor-pointer">
                Offers Free Estimates
              </label>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="space-y-3">
          <Label>Certifications</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {COMMON_CERTIFICATIONS.map((cert) => (
              <div key={cert} className="flex items-center space-x-2">
                <Checkbox
                  id={`cert-${cert}`}
                  checked={filters.certifications.includes(cert)}
                  onCheckedChange={() => handleCertificationToggle(cert)}
                />
                <label
                  htmlFor={`cert-${cert}`}
                  className="text-sm cursor-pointer"
                >
                  {cert}
                </label>
              </div>
            ))}
          </div>
          {filters.certifications.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.certifications.map((cert) => (
                <Badge key={cert} variant="secondary" className="gap-1">
                  {cert}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleCertificationToggle(cert)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Category Multi-Select */}
        <div className="space-y-3">
          <Label>Categories</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={filters.selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <label
                  htmlFor={`category-${category.id}`}
                  className="text-sm cursor-pointer"
                >
                  {category.name}
                </label>
              </div>
            ))}
          </div>
          {filters.selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.selectedCategories.map((catId) => {
                const category = categories.find(c => c.id === catId);
                return category ? (
                  <Badge key={catId} variant="secondary" className="gap-1">
                    {category.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleCategoryToggle(catId)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Save search & email alerts */}
        <div className="space-y-1.5 pt-3 border-t border-border/60">
          <Label className="text-xs font-medium text-muted-foreground">
            Save search & get alerts
          </Label>
          <p className="text-[10px] text-muted-foreground">
            We email you when new diggers match these filters.
          </p>
          <div className="flex gap-1.5">
            <Input
              placeholder="e.g. Plumbers near Boston"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="h-8 text-xs flex-1 min-w-0"
            />
            <Button onClick={handleSaveSearch} disabled={saving} size="sm" className="h-8 shrink-0 text-xs">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
