import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
}

interface CategoryGroup {
  parent: Category;
  subcategories: Category[];
}

interface RegistrationCategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export const RegistrationCategorySelector: React.FC<RegistrationCategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
}) => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;

      // Group categories by parent
      const parents = data.filter(cat => !cat.parent_category_id);
      const groups: CategoryGroup[] = parents.map(parent => ({
        parent,
        subcategories: data.filter(cat => cat.parent_category_id === parent.id)
      }));

      setCategoryGroups(groups);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoriesChange(newCategories);
  };

  const getCategoryName = (categoryId: string): string => {
    for (const group of categoryGroups) {
      if (group.parent.id === categoryId) return group.parent.name;
      const sub = group.subcategories.find(s => s.id === categoryId);
      if (sub) return sub.name;
    }
    return "";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Select Categories *</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select all specialties you want to register under.
        </p>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-2">
          {categoryGroups.map((group) => (
            <AccordionItem 
              key={group.parent.id} 
              value={group.parent.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-base">{group.parent.name}</span>
                  {selectedCategories.some(id => 
                    id === group.parent.id || group.subcategories.some(s => s.id === id)
                  ) && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCategories.filter(id => 
                        id === group.parent.id || group.subcategories.some(s => s.id === id)
                      ).length} selected
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2 pb-2">
                  {/* Parent category */}
                  <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={group.parent.id}
                      checked={selectedCategories.includes(group.parent.id)}
                      onCheckedChange={() => handleCategoryToggle(group.parent.id)}
                    />
                    <div className="grid gap-1 flex-1">
                      <Label
                        htmlFor={group.parent.id}
                        className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {group.parent.name} (General)
                      </Label>
                      {group.parent.description && (
                        <p className="text-sm text-muted-foreground">
                          {group.parent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subcategories */}
                  {group.subcategories.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
                      {group.subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            id={subcategory.id}
                            checked={selectedCategories.includes(subcategory.id)}
                            onCheckedChange={() => handleCategoryToggle(subcategory.id)}
                          />
                          <div className="grid gap-1 flex-1">
                            <Label
                              htmlFor={subcategory.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {subcategory.name}
                            </Label>
                            {subcategory.description && (
                              <p className="text-xs text-muted-foreground">
                                {subcategory.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Selected Categories Summary */}
      {selectedCategories.length > 0 && (
        <div className="mt-4 p-4 bg-accent/30 rounded-lg">
          <h4 className="font-medium mb-2">Selected Categories:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((catId) => (
              <Badge key={catId} variant="secondary">
                {getCategoryName(catId)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedCategories.length > 1 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Tip:</strong> Selecting multiple specialties increases your visibility to potential clients across different service categories.
          </p>
        </div>
      )}
    </div>
  );
};
