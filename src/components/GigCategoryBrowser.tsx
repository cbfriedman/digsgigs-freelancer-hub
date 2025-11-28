import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wrench, Home, Briefcase, Users, Lightbulb, Palette, 
  Code, Camera, Music, PenTool, ShoppingCart, Car,
  Heart, Book, Globe, TrendingUp, Building, Shirt,
  Sparkles, ChevronRight, Check, Loader2
} from "lucide-react";

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

interface GigCategoryBrowserProps {
  value: string;
  onChange: (categoryId: string) => void;
  onAutoDetect?: () => void;
  autoDetecting?: boolean;
  suggestedCategory?: string | null;
}

// Icon mapping for parent categories
const getCategoryIcon = (categoryName: string) => {
  const iconMap: Record<string, any> = {
    "Home & Repair": Home,
    "Business Services": Briefcase,
    "Professional Services": Users,
    "Creative & Design": Palette,
    "Technology": Code,
    "Media & Entertainment": Camera,
    "Writing & Translation": PenTool,
    "Marketing": TrendingUp,
    "Sales": ShoppingCart,
    "Transportation": Car,
    "Health & Wellness": Heart,
    "Education": Book,
    "Legal": Building,
    "Fashion": Shirt,
    "Events": Sparkles,
  };
  return iconMap[categoryName] || Wrench;
};

export const GigCategoryBrowser: React.FC<GigCategoryBrowserProps> = ({
  value,
  onChange,
  onAutoDetect,
  autoDetecting = false,
  suggestedCategory = null,
}) => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-expand parent when category is selected or suggested
  useEffect(() => {
    if (value || suggestedCategory) {
      const categoryId = suggestedCategory || value;
      const parentGroup = categoryGroups.find(group => 
        group.subcategories.some(sub => sub.id === categoryId)
      );
      if (parentGroup) {
        setExpandedParent(parentGroup.parent.id);
      }
    }
  }, [value, suggestedCategory, categoryGroups]);

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

  const getSelectedCategoryInfo = () => {
    if (!value) return null;
    
    for (const group of categoryGroups) {
      const subcategory = group.subcategories.find(s => s.id === value);
      if (subcategory) {
        return {
          parent: group.parent.name,
          subcategory: subcategory.name
        };
      }
    }
    return null;
  };

  const selectedInfo = getSelectedCategoryInfo();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Category *</Label>
        {onAutoDetect && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoDetect}
            disabled={autoDetecting}
            className="gap-2"
          >
            {autoDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Auto-detect Category
              </>
            )}
          </Button>
        )}
      </div>

      {selectedInfo && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="font-medium">Selected:</span>
              <span>{selectedInfo.parent} → {selectedInfo.subcategory}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryGroups.map((group) => {
          const Icon = getCategoryIcon(group.parent.name);
          const isExpanded = expandedParent === group.parent.id;
          const hasSelection = group.subcategories.some(sub => sub.id === value);

          return (
            <Card 
              key={group.parent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                hasSelection ? 'border-primary bg-primary/5' : ''
              } ${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}
              onClick={() => setExpandedParent(isExpanded ? null : group.parent.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      hasSelection ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      {group.parent.name}
                    </CardTitle>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.subcategories.map((subcategory) => {
                      const isSelected = value === subcategory.id;
                      const isSuggested = suggestedCategory === subcategory.id;

                      return (
                        <button
                          key={subcategory.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange(subcategory.id);
                          }}
                          className={`text-left p-3 rounded-lg border-2 transition-all hover:border-primary/50 ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : isSuggested
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm mb-1 flex items-center gap-2">
                                {subcategory.name}
                                {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                              </div>
                              {subcategory.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {subcategory.description}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSuggested && !isSelected && (
                            <Badge variant="outline" className="mt-2 text-xs border-amber-500 text-amber-700 dark:text-amber-400">
                              AI Suggested
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        Click a category to expand and select the most specific subcategory that matches your gig
      </p>
    </div>
  );
};

export default GigCategoryBrowser;
