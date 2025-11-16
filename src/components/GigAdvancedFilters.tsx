import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface GigFilters {
  budgetRange: [number, number];
  selectedCategories: string[];
  locationRadius: number;
  locationLat?: number;
  locationLng?: number;
}

interface GigAdvancedFiltersProps {
  categories: Category[];
  filters: GigFilters;
  onFiltersChange: (filters: GigFilters) => void;
  onSaveSearch: () => void;
}

export const GigAdvancedFilters = ({ 
  categories, 
  filters, 
  onFiltersChange,
  onSaveSearch
}: GigAdvancedFiltersProps) => {
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleBudgetChange = (value: number[]) => {
    onFiltersChange({ ...filters, budgetRange: [value[0], value[1]] });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.selectedCategories.includes(categoryId)
      ? filters.selectedCategories.filter(id => id !== categoryId)
      : [...filters.selectedCategories, categoryId];
    onFiltersChange({ ...filters, selectedCategories: newCategories });
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
          search_type: 'gigs',
          name: searchName,
          filters: filters as any,
          email_alerts_enabled: true
        }]);

      if (error) throw error;

      toast.success("Search saved successfully! You'll receive email alerts for matching gigs.");
      setSearchName("");
      onSaveSearch();
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error("Failed to save search");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      budgetRange: [0, 50000],
      selectedCategories: [],
      locationRadius: 50,
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
        {/* Budget Range */}
        <div className="space-y-3">
          <Label>Budget Range: ${filters.budgetRange[0]} - ${filters.budgetRange[1]}</Label>
          <Slider
            min={0}
            max={50000}
            step={500}
            value={filters.budgetRange}
            onValueChange={handleBudgetChange}
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

        {/* Save Search */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Save Search & Get Email Alerts
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search name (e.g., 'Plumbing jobs in NYC')"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <Button onClick={handleSaveSearch} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
