import React from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield } from "lucide-react";
import { useProfessions } from "@/hooks/useProfessions";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

interface RegistrationCategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export const RegistrationCategorySelector: React.FC<RegistrationCategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
}) => {
  const { categoriesWithProfessions, professions, loading, error, getLeadTierBadgeColor } = useProfessions();

  const handleProfessionToggle = (professionId: string) => {
    const newCategories = selectedCategories.includes(professionId)
      ? selectedCategories.filter((id) => id !== professionId)
      : [...selectedCategories, professionId];
    onCategoriesChange(newCategories);
  };

  const getProfessionName = (professionId: string): string => {
    const profession = professions.find(p => p.id === professionId);
    return profession?.name || "";
  };

  const getLeadPrice = (tier: 'low' | 'mid' | 'high'): number => {
    const prices = { low: 10, mid: 15, high: 25 };
    return prices[tier];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load professions. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Select Your Professions *</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select all the services you want to offer. Lead pricing is shown for each profession.
        </p>
      </div>

      {/* Safety Disclaimer */}
      <SafetyDisclaimer variant="compact" />

      {/* Lead Tier Legend */}
      <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg text-sm">
        <span className="font-medium">Lead Pricing:</span>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="bg-green-100 text-green-800 px-1.5 py-0">LV</Badge>
          <span>$10/lead</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-1.5 py-0">MV</Badge>
          <span>$15/lead</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 px-1.5 py-0">HV</Badge>
          <span>$25/lead</span>
        </div>
      </div>
      
      <Accordion type="multiple" className="w-full space-y-2">
        {categoriesWithProfessions.map((category) => (
          <AccordionItem 
            key={category.id} 
            value={category.id}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-base">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {category.professions.length} professions
                </Badge>
                {selectedCategories.some(id => 
                  category.professions.some(p => p.id === id)
                ) && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    {selectedCategories.filter(id => 
                      category.professions.some(p => p.id === id)
                    ).length} selected
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2 pb-2">
                {category.professions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No professions available in this category yet.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {category.professions.map((profession) => (
                      <div
                        key={profession.id}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors border"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            id={profession.id}
                            checked={selectedCategories.includes(profession.id)}
                            onCheckedChange={() => handleProfessionToggle(profession.id)}
                          />
                          <div className="flex flex-col gap-0.5">
                            <Label
                              htmlFor={profession.id}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {profession.name}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              ${getLeadPrice(profession.lead_tier)}/lead
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-1.5 py-0 ${getLeadTierBadgeColor(profession.lead_tier)}`}
                        >
                          {profession.lead_tier === 'low' ? 'LV' : profession.lead_tier === 'mid' ? 'MV' : 'HV'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Selected Professions Summary */}
      {selectedCategories.length > 0 && (
        <div className="mt-4 p-4 bg-accent/30 rounded-lg">
          <h4 className="font-medium mb-2">Selected Professions ({selectedCategories.length}):</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((profId) => {
              const profession = professions.find(p => p.id === profId);
              if (!profession) return null;
              return (
                <Badge key={profId} variant="secondary" className="flex items-center gap-1">
                  {profession.name}
                  <span className="text-xs text-muted-foreground">(${getLeadPrice(profession.lead_tier)})</span>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {selectedCategories.length > 1 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Tip:</strong> Selecting multiple professions increases your visibility to potential clients across different service categories.
          </p>
        </div>
      )}
    </div>
  );
};
