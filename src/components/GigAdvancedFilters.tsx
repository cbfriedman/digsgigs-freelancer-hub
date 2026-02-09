import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Bell, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
}

export interface GigFilters {
  budgetRange: [number, number];
  selectedCategories: string[];
  locationRadius: number;
  locationLat?: number;
  locationLng?: number;
  postedSince: "all" | "24h" | "7d" | "30d";
  sortBy: "newest" | "oldest" | "budget_asc" | "budget_desc";
}

const BUDGET_PRESETS: { label: string; range: [number, number] }[] = [
  { label: "Any", range: [0, 50000] },
  { label: "Under $1k", range: [0, 1000] },
  { label: "$1k – $5k", range: [1000, 5000] },
  { label: "$5k – $10k", range: [5000, 10000] },
  { label: "$10k+", range: [10000, 50000] },
];

const POSTED_OPTIONS: { value: GigFilters["postedSince"]; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const SORT_OPTIONS: { value: GigFilters["sortBy"]; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "budget_asc", label: "Budget: low → high" },
  { value: "budget_desc", label: "Budget: high → low" },
];

const DEFAULT_FILTERS: GigFilters = {
  budgetRange: [0, 50000],
  selectedCategories: [],
  locationRadius: 50,
  postedSince: "all",
  sortBy: "newest",
};

interface GigAdvancedFiltersProps {
  categories: Category[];
  filters: GigFilters;
  onFiltersChange: (filters: GigFilters) => void;
}

export const GigAdvancedFilters = ({
  categories,
  filters,
  onFiltersChange,
}: GigAdvancedFiltersProps) => {
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleBudgetChange = (value: number[]) => {
    onFiltersChange({ ...filters, budgetRange: [value[0], value[1]] });
  };

  const handleBudgetPreset = (range: [number, number]) => {
    onFiltersChange({ ...filters, budgetRange: range });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.selectedCategories.includes(categoryId)
      ? filters.selectedCategories.filter((id) => id !== categoryId)
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
        .from("saved_searches")
        .insert([
          {
            user_id: user.id,
            search_type: "gigs",
            name: searchName,
            filters: filters as Record<string, unknown>,
            email_alerts_enabled: true,
          },
        ]);

      if (error) throw error;

      toast.success(
        "Search saved! You'll get email alerts when new gigs match."
      );
      setSearchName("");
    } catch (error) {
      console.error("Error saving search:", error);
      toast.error("Failed to save search");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange({ ...DEFAULT_FILTERS });
  };

  const hasActiveFilters =
    filters.budgetRange[0] !== 0 ||
    filters.budgetRange[1] !== 50000 ||
    filters.selectedCategories.length > 0 ||
    filters.locationRadius !== 50 ||
    filters.postedSince !== "all" ||
    filters.sortBy !== "newest";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Refine results
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Sort – first so it’s easy to find */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort by</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(v: GigFilters["sortBy"]) =>
                onFiltersChange({ ...filters, sortBy: v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posted when */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Posted</Label>
            <Select
              value={filters.postedSince}
              onValueChange={(v: GigFilters["postedSince"]) =>
                onFiltersChange({ ...filters, postedSince: v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSTED_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget – presets + slider */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Budget</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map(({ label, range }) => {
                const isActive =
                  filters.budgetRange[0] === range[0] &&
                  filters.budgetRange[1] === range[1];
                return (
                  <Button
                    key={label}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleBudgetPreset(range)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Or set range: ${filters.budgetRange[0].toLocaleString()} – $
                {filters.budgetRange[1].toLocaleString()}
              </span>
              <Slider
                min={0}
                max={50000}
                step={500}
                value={filters.budgetRange}
                onValueChange={handleBudgetChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Location radius */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Within {filters.locationRadius} miles
            </Label>
            <Slider
              min={5}
              max={200}
              step={5}
              value={[filters.locationRadius]}
              onValueChange={handleLocationRadiusChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Used when a location is set for the gig.
            </p>
          </div>

          {/* Categories – grouped by parent to match project/gig categories */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categories</Label>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {(() => {
                const parents = categories.filter((c) => !c.parent_category_id);
                const getChildren = (parentId: string) =>
                  categories.filter((c) => c.parent_category_id === parentId);
                return parents.map((parent) => {
                  const subcategories = getChildren(parent.id);
                  return (
                    <div key={parent.id} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${parent.id}`}
                          checked={filters.selectedCategories.includes(parent.id)}
                          onCheckedChange={() => handleCategoryToggle(parent.id)}
                        />
                        <label
                          htmlFor={`category-${parent.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {parent.name}
                        </label>
                      </div>
                      {subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center space-x-2 pl-6"
                        >
                          <Checkbox
                            id={`category-${sub.id}`}
                            checked={filters.selectedCategories.includes(sub.id)}
                            onCheckedChange={() => handleCategoryToggle(sub.id)}
                          />
                          <label
                            htmlFor={`category-${sub.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {sub.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
            {filters.selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.selectedCategories.map((catId) => {
                  const category = categories.find((c) => c.id === catId);
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

          {/* Save search */}
          <div className="space-y-2 pt-3 border-t">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" />
              Save search & get alerts
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Plumbing jobs nearby"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="text-sm"
              />
              <Button onClick={handleSaveSearch} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform tip – Digs & Gigs specific */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Why Digs & Gigs?</p>
              <p className="text-muted-foreground">
                Pay per lead, 8% only when you win the job—no membership fees.
                Save a search above and we’ll email you when new gigs match.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
