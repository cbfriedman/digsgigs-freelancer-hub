import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface GigCategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export const GigCategorySelector: React.FC<GigCategorySelectorProps> = ({
  value,
  onChange,
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
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCategoryName = () => {
    if (!value) return undefined;
    
    for (const group of categoryGroups) {
      const subcategory = group.subcategories.find(s => s.id === value);
      if (subcategory) {
        return `${group.parent.name} → ${subcategory.name}`;
      }
    }
    return undefined;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="category">Category *</Label>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading categories...</div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category">
              {getSelectedCategoryName()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {categoryGroups.map((group) => (
              <React.Fragment key={group.parent.id}>
                <div className="px-2 py-1.5 text-sm font-semibold text-foreground bg-muted/50">
                  {group.parent.name}
                </div>
                {group.subcategories.map((subcategory) => (
                  <SelectItem 
                    key={subcategory.id} 
                    value={subcategory.id}
                    className="pl-6"
                  >
                    {subcategory.name}
                    {subcategory.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        - {subcategory.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-sm text-muted-foreground">
        Select the most specific category that matches your gig
      </p>
    </div>
  );
};

export default GigCategorySelector;
