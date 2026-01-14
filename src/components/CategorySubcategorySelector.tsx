import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TECH_CATEGORIES, getSubcategoriesForCategory, Subcategory } from "@/config/techCategories";

interface CategorySubcategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategorySlug: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategorySlug: string) => void;
  categoryLabel?: string;
  subcategoryLabel?: string;
  required?: boolean;
}

export const CategorySubcategorySelector = ({
  selectedCategoryId,
  selectedSubcategorySlug,
  onCategoryChange,
  onSubcategoryChange,
  categoryLabel = "What kind of help do you need?",
  subcategoryLabel = "Select the closest match",
  required = true,
}: CategorySubcategorySelectorProps) => {
  const subcategories = useMemo(() => {
    return getSubcategoriesForCategory(selectedCategoryId);
  }, [selectedCategoryId]);

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value);
    // Reset subcategory when category changes
    onSubcategoryChange("");
  };

  return (
    <div className="space-y-4">
      {/* Category Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="category">
          {categoryLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {TECH_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategoryId && (
          <p className="text-xs text-muted-foreground">
            {TECH_CATEGORIES.find(c => c.id === selectedCategoryId)?.description}
          </p>
        )}
      </div>

      {/* Subcategory Dropdown - Only show when category is selected */}
      {selectedCategoryId && subcategories.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="subcategory">
            {subcategoryLabel} {required && <span className="text-destructive">*</span>}
          </Label>
          <Select value={selectedSubcategorySlug} onValueChange={onSubcategoryChange}>
            <SelectTrigger id="subcategory" className="w-full">
              <SelectValue placeholder="Select a subcategory..." />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sub) => (
                <SelectItem key={sub.slug} value={sub.slug}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
