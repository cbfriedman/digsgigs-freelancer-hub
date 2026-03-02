import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Save, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
}

/** Profession from DB (industry_categories + professions) with keywords for matching gigs */
export interface ProfessionOption {
  id: string;
  name: string;
  keywords: string[];
}

export interface IndustryCategoryWithProfessions {
  id: string;
  name: string;
  professions: ProfessionOption[];
}

export interface GigFilters {
  budgetRange: [number, number];
  selectedCategories: string[];
  /** Profession IDs (selecting a profession = all its keywords) */
  selectedProfessionIds: string[];
  /** Individual keywords selected (each item can be toggled) */
  selectedKeywords: string[];
  locationRadius: number;
  locationLat?: number;
  locationLng?: number;
  postedSince: "all" | "24h" | "7d" | "30d";
  sortBy: "newest" | "oldest" | "budget_asc" | "budget_desc";
}

const DEFAULT_FILTERS: GigFilters = {
  budgetRange: [0, 50000],
  selectedCategories: [],
  selectedProfessionIds: [],
  selectedKeywords: [],
  locationRadius: 50,
  postedSince: "all",
  sortBy: "newest",
};

interface GigAdvancedFiltersProps {
  /** Legacy categories (optional – main filter is professions & keywords) */
  categories?: Category[];
  /** Real professions + keywords from industry_categories & professions tables */
  categoriesWithProfessions?: IndustryCategoryWithProfessions[];
  filters: GigFilters;
  onFiltersChange: (filters: GigFilters) => void;
  /** Called after a search is saved so the saved-searches list can refresh without page reload */
  onSavedSearch?: () => void;
}

export const GigAdvancedFilters = ({
  categories = [],
  categoriesWithProfessions = [],
  filters,
  onFiltersChange,
  onSavedSearch,
}: GigAdvancedFiltersProps) => {
  const [searchName, setSearchName] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProfessionIds = filters.selectedProfessionIds ?? [];
  const selectedKeywords = filters.selectedKeywords ?? [];

  const handleProfessionToggle = (professionId: string) => {
    const next = selectedProfessionIds.includes(professionId)
      ? selectedProfessionIds.filter((id) => id !== professionId)
      : [...selectedProfessionIds, professionId];
    onFiltersChange({ ...filters, selectedProfessionIds: next });
  };

  const handleKeywordToggle = (keyword: string) => {
    const key = keyword.toLowerCase();
    const next = selectedKeywords.some((k) => k.toLowerCase() === key)
      ? selectedKeywords.filter((k) => k.toLowerCase() !== key)
      : [...selectedKeywords, keyword];
    onFiltersChange({ ...filters, selectedKeywords: next });
  };

  const isKeywordSelected = (keyword: string) =>
    selectedKeywords.some((k) => k.toLowerCase() === keyword.toLowerCase());

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.selectedCategories.includes(categoryId)
      ? filters.selectedCategories.filter((id) => id !== categoryId)
      : [...filters.selectedCategories, categoryId];
    onFiltersChange({ ...filters, selectedCategories: newCategories });
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
            filters: filters as unknown as import("@/integrations/supabase/types").Json,
            email_alerts_enabled: true,
          },
        ]);

      if (error) throw error;

      toast.success("Saved. We’ll email when new gigs match.");
      setSearchName("");
      onSavedSearch?.();
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
    (filters.selectedProfessionIds?.length ?? 0) > 0 ||
    (filters.selectedKeywords?.length ?? 0) > 0 ||
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
          {/* Professions & keywords */}
          {categoriesWithProfessions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Professions & keywords
              </Label>
              <p className="text-xs text-muted-foreground">
                Select a profession (all its keywords) or pick individual keywords. Gigs match if title/description contain any selected keyword.
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {categoriesWithProfessions.map((cat) => (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                      {cat.name}
                    </div>
                    {cat.professions.map((prof) => (
                      <div key={prof.id} className="space-y-1.5 pl-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`prof-${prof.id}`}
                            checked={selectedProfessionIds.includes(prof.id)}
                            onCheckedChange={() => handleProfessionToggle(prof.id)}
                          />
                          <label
                            htmlFor={`prof-${prof.id}`}
                            className="text-sm cursor-pointer font-medium"
                          >
                            {prof.name}
                          </label>
                        </div>
                        {prof.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {prof.keywords.map((kw) => {
                              const selected = isKeywordSelected(kw);
                              return (
                                <Badge
                                  key={`${prof.id}-${kw}`}
                                  variant={selected ? "default" : "outline"}
                                  className="cursor-pointer text-xs font-normal py-0.5 px-2 hover:opacity-90"
                                  onClick={() => handleKeywordToggle(kw)}
                                >
                                  {kw}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {(selectedProfessionIds.length > 0 || selectedKeywords.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedProfessionIds.map((profId) => {
                    const prof = categoriesWithProfessions
                      .flatMap((c) => c.professions)
                      .find((p) => p.id === profId);
                    return prof ? (
                      <Badge key={`p-${profId}`} variant="secondary" className="gap-1">
                        {prof.name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleProfessionToggle(profId)}
                        />
                      </Badge>
                    ) : null;
                  })}
                  {selectedKeywords.map((kw) => (
                    <Badge key={`k-${kw}`} variant="secondary" className="gap-1">
                      {kw}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleKeywordToggle(kw)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save search & email alerts – new gigs matching this search */}
          <div className="space-y-1.5 pt-3 border-t border-border/60">
            <Label className="text-xs font-medium text-muted-foreground">
              Save search & get alerts
            </Label>
            <p className="text-[10px] text-muted-foreground">
              We email you when new gigs match these filters.
            </p>
            <div className="flex gap-1.5">
              <Input
                placeholder="e.g. Web dev gigs"
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
    </div>
  );
};
