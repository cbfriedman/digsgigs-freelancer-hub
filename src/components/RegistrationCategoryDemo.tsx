import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import IndustryCodeLookup from "./IndustryCodeLookup";

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

const categories = [
  { id: "1", name: "Construction", description: "General contracting, carpentry, remodeling" },
  { id: "2", name: "Plumbing", description: "Residential and commercial plumbing" },
  { id: "3", name: "Electrical", description: "Licensed electrical work and installations" },
  { id: "4", name: "HVAC", description: "Heating, ventilation, and air conditioning" },
  { id: "5", name: "Web Development", description: "Website and web application development" },
  { id: "6", name: "Mobile Apps", description: "iOS and Android app development" },
  { id: "7", name: "UI/UX Design", description: "User interface and experience design" },
  { id: "8", name: "Architecture", description: "Architectural design and planning" },
  { id: "9", name: "Interior Design", description: "Interior space planning and design" },
  { id: "10", name: "Business Law", description: "Corporate and business legal services" },
  { id: "11", name: "Intellectual Property", description: "Patents, trademarks, and copyrights" },
  { id: "12", name: "Real Estate Law", description: "Property and real estate legal matters" },
  { id: "others", name: "Other Professions", description: "Select using SIC or NAICS industry codes" },
];

export const RegistrationCategoryDemo = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["1", "2", "5"]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [selectedCode, setSelectedCode] = useState<IndustryCode | null>(null);
  const [customTitle, setCustomTitle] = useState("");

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === "others") {
      setShowCodeDialog(true);
      return;
    }
    
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
          Choose all categories you want to register under. This allows you to receive gig opportunities across multiple fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto border rounded-md p-4 bg-muted/20">
          {categories.map((category) => (
            <div key={category.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
              {category.id === "others" ? (
                <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleCategoryToggle(category.id)}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{category.name}</div>
                        <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
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
              ) : (
                <>
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                    className="mt-1"
                  />
                  <div className="grid gap-1 leading-none flex-1">
                    <Label
                      htmlFor={category.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {category.name}
                    </Label>
                    {category.description && (
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-medium">Selected categories ({selectedCategories.length}):</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.length > 0 ? (
              selectedCategories.map((id) => {
                if (id === "others" && selectedCode) {
                  return (
                    <Badge key={id} variant="secondary" className="text-sm px-3 py-1">
                      {customTitle} ({selectedCode.code_type}: {selectedCode.code})
                    </Badge>
                  );
                }
                const category = categories.find((c) => c.id === id);
                return category && category.id !== "others" ? (
                  <Badge key={id} variant="secondary" className="text-sm px-3 py-1">
                    {category.name}
                  </Badge>
                ) : null;
              })
            ) : (
              <p className="text-sm text-muted-foreground italic">No categories selected yet</p>
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
