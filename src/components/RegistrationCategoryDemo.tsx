import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export const RegistrationCategoryDemo = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [selectedCode, setSelectedCode] = useState<IndustryCode | null>(null);
  const [customTitle, setCustomTitle] = useState("");
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
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCodeSelect = (code: IndustryCode, title: string) => {
    setSelectedCode(code);
    setCustomTitle(title);
    if (!selectedCategories.includes("others")) {
      setSelectedCategories((prev) => [...prev, "others"]);
    }
    setShowCodeDialog(false);
  };

  const hasOthersSelected = selectedCategories.includes("others");

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Select Your Categories</CardTitle>
        <CardDescription className="text-base">
          Choose all specialties you want to register under. This allows you to receive gig opportunities across multiple fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                Other Professions
              </AccordionTrigger>
              <AccordionContent>
                <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto p-3"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">Select using SIC or NAICS industry codes</div>
                        {hasOthersSelected && selectedCode && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {selectedCode.code_type}: {selectedCode.code} - {customTitle}
                          </Badge>
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
                      selectedCode={selectedCode}
                      customTitle={customTitle}
                    />
                  </DialogContent>
                </Dialog>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-medium">Selected specialties ({selectedCategories.length + (hasOthersSelected ? 1 : 0)}):</p>
          </div>
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
                {hasOthersSelected && selectedCode && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {customTitle} ({selectedCode.code_type}: {selectedCode.code})
                  </Badge>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No specialties selected yet</p>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-foreground/80">
            💡 <span className="font-semibold">Tip:</span> Selecting multiple categories increases your visibility and helps you get more gig opportunities that match your diverse skill set.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegistrationCategoryDemo;
