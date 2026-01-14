import { useState, useRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TECH_CATEGORIES, getSubcategoriesForCategory, Subcategory } from "@/config/techCategories";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export interface CategorySelection {
  categoryId: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
}

interface MultiCategorySubcategorySelectorProps {
  selectedItems: CategorySelection[];
  onSelectionChange: (items: CategorySelection[]) => void;
  maxSelections?: number;
  required?: boolean;
}

export const MultiCategorySubcategorySelector = ({
  selectedItems,
  onSelectionChange,
  maxSelections = 5,
  required = true,
}: MultiCategorySubcategorySelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const isUpdatingRef = useRef(false);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isSubcategorySelected = (categoryId: string, subcategorySlug: string) => {
    return selectedItems.some(
      item => item.categoryId === categoryId && item.subcategorySlug === subcategorySlug
    );
  };

  const toggleSubcategory = (categoryId: string, categoryName: string, subcategory: Subcategory) => {
    if (!subcategory?.slug || isUpdatingRef.current) return;
    
    const isSelected = isSubcategorySelected(categoryId, subcategory.slug);
    
    // Early return if trying to add when already selected or remove when not selected
    // This prevents unnecessary state updates
    if (isSelected) {
      // Remove the selection
      const filtered = selectedItems.filter(
        item => !(item.categoryId === categoryId && item.subcategorySlug === subcategory.slug)
      );
      // Only update if the array actually changed
      if (filtered.length !== selectedItems.length) {
        isUpdatingRef.current = true;
        onSelectionChange(filtered);
        // Reset flag after React processes the update
        requestAnimationFrame(() => {
          isUpdatingRef.current = false;
        });
      }
    } else {
      // Add the selection if under max
      if (selectedItems.length >= maxSelections) {
        return; // Don't add more than max
      }
      // Check if already exists (prevent duplicates)
      const exists = selectedItems.some(
        item => item.categoryId === categoryId && item.subcategorySlug === subcategory.slug
      );
      if (!exists) {
        isUpdatingRef.current = true;
        onSelectionChange([
          ...selectedItems,
          {
            categoryId,
            categoryName,
            subcategorySlug: subcategory.slug,
            subcategoryName: subcategory.name,
          },
        ]);
        // Reset flag after React processes the update
        requestAnimationFrame(() => {
          isUpdatingRef.current = false;
        });
      }
    }
  };

  const removeSelection = (categoryId: string, subcategorySlug: string) => {
    onSelectionChange(
      selectedItems.filter(
        item => !(item.categoryId === categoryId && item.subcategorySlug === subcategorySlug)
      )
    );
  };

  const getSelectedCountForCategory = (categoryId: string) => {
    return selectedItems.filter(item => item.categoryId === categoryId).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>
          Select Your Services {required && <span className="text-destructive">*</span>}
        </Label>
        <span className="text-xs text-muted-foreground">
          {selectedItems.length}/{maxSelections} selected
        </span>
      </div>

      {/* Selected Items Display */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedItems.map((item) => (
            <Badge
              key={`${item.categoryId}-${item.subcategorySlug}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs">
                {item.categoryName}: {item.subcategoryName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={() => removeSelection(item.categoryId, item.subcategorySlug)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Category Browser */}
      <ScrollArea className="h-[300px] border rounded-lg p-2">
        <div className="space-y-1">
          {TECH_CATEGORIES.map((category) => {
            const subcategories = getSubcategoriesForCategory(category.id);
            const isExpanded = expandedCategories.includes(category.id);
            const selectedCount = getSelectedCountForCategory(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between font-medium hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>{category.name}</span>
                    </div>
                    {selectedCount > 0 && (
                      <Badge variant="default" className="text-xs">
                        {selectedCount}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1 pt-1">
                  {subcategories.map((sub) => {
                    const isSelected = isSubcategorySelected(category.id, sub.slug);
                    const isDisabled = !isSelected && selectedItems.length >= maxSelections;

                    return (
                      <div
                        key={sub.slug}
                        className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Checkbox
                          id={`checkbox-${category.id}-${sub.slug}`}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={(checked) => {
                            // Prevent infinite loops - only toggle if state actually changed
                            if (checked === isSelected || isUpdatingRef.current) {
                              return;
                            }
                            toggleSubcategory(category.id, category.name, sub);
                          }}
                          onClick={(e) => {
                            // Prevent the click from bubbling up to parent elements
                            e.stopPropagation();
                          }}
                        />
                        <label 
                          htmlFor={`checkbox-${category.id}-${sub.slug}`}
                          className="text-sm flex-1 cursor-pointer select-none"
                        >
                          {sub.name}
                        </label>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Select up to {maxSelections} services that best describe what you offer.
      </p>
    </div>
  );
};
