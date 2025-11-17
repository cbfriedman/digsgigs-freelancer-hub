import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import IndustryCodeLookup from "./IndustryCodeLookup";

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

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
  onIndustryCodesChange?: (codes: IndustryCode[], titles: string[]) => void;
}

export const RegistrationCategorySelector: React.FC<RegistrationCategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
  onIndustryCodesChange,
}) => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<IndustryCode[]>([]);
  const [customTitles, setCustomTitles] = useState<string[]>([]);
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

  const handleCodeSelect = (code: IndustryCode, title: string) => {
    const newCodes = [...selectedCodes, code];
    const newTitles = [...customTitles, title];
    setSelectedCodes(newCodes);
    setCustomTitles(newTitles);
    setShowCodeDialog(false);
    
    if (onIndustryCodesChange) {
      onIndustryCodesChange(newCodes, newTitles);
    }
  };

  const handleRemoveCode = (index: number) => {
    const newCodes = selectedCodes.filter((_, i) => i !== index);
    const newTitles = customTitles.filter((_, i) => i !== index);
    setSelectedCodes(newCodes);
    setCustomTitles(newTitles);
    
    if (onIndustryCodesChange) {
      onIndustryCodesChange(newCodes, newTitles);
    }
  };

  const hasOthersSelected = selectedCodes.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Select Categories *</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select all specialties you want to register under. Each category will be a separate "Dig".
        </p>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
      ) : (
        <Accordion type="multiple" className="w-full max-h-[500px] overflow-y-auto border rounded-md p-4 bg-muted/20">
          {categoryGroups.map((group) => (
            <AccordionItem key={group.parent.id} value={group.parent.id} className="border-b last:border-b-0">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                {group.parent.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {group.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                      <Checkbox
                        id={subcategory.id}
                        checked={selectedCategories.includes(subcategory.id)}
                        onCheckedChange={() => handleCategoryToggle(subcategory.id)}
                        className="mt-1"
                      />
                      <div className="grid gap-1 leading-none flex-1">
                        <Label
                          htmlFor={subcategory.id}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {subcategory.name}
                        </Label>
                        {subcategory.description && (
                          <p className="text-xs text-muted-foreground">{subcategory.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          
          <AccordionItem value="others" className="border-b-0">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              Primary Profession
            </AccordionTrigger>
            <AccordionContent>
              <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto p-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {selectedCodes.length === 0 
                          ? "Select using SIC or NAICS industry codes" 
                          : `Add another profession (${selectedCodes.length} selected)`}
                      </div>
                      {hasOthersSelected && (
                        <div className="mt-2 space-y-1">
                          {selectedCodes.map((code, index) => (
                            <Badge key={index} variant="secondary" className="text-xs mr-1">
                              {code.code_type}: {code.code} - {customTitles[index]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Select Your Industry Code</DialogTitle>
                  </DialogHeader>
                  <IndustryCodeLookup 
                    onSelect={handleCodeSelect}
                    selectedCode={null}
                    customTitle=""
                  />
                </DialogContent>
              </Dialog>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="pt-2">
        <p className="text-sm font-medium mb-2">
          Selected: {selectedCategories.length} {selectedCategories.length === 1 ? 'specialty' : 'specialties'}
          {hasOthersSelected && ' + 1 primary profession'}
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedCategories.length > 0 || hasOthersSelected ? (
            <>
              {selectedCategories.map((id) => {
                const category = categoryGroups
                  .flatMap(g => g.subcategories)
                  .find(c => c.id === id);
                return category ? (
                  <Badge key={id} variant="secondary" className="text-sm px-3 py-1">
                    {category.name}
                  </Badge>
                ) : null;
              })}
              {selectedCodes.map((code, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="text-sm px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveCode(index)}
                >
                  {customTitles[index]} ({code.code_type}: {code.code}) ×
                </Badge>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No specialties selected yet</p>
          )}
        </div>
      </div>

      <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">
        💡 <span className="font-semibold">Tip:</span> Selecting multiple specialties increases your visibility and helps you get more gig opportunities.
      </p>
    </div>
  );
};

export default RegistrationCategorySelector;
