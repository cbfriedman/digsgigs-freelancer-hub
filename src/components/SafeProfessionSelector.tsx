import { useState, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, X, Search, Shield, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfessions, Profession, CategoryWithProfessions } from "@/hooks/useProfessions";
import { Skeleton } from "@/components/ui/skeleton";
import { getIndustryContentByName, IndustryContentConfig } from "@/config/industryContent";
interface SafeProfessionSelectorProps {
  selectedProfessionIds: string[];
  onProfessionsChange: (professionIds: string[]) => void;
  maxSelections?: number;
}

export const SafeProfessionSelector = ({ 
  selectedProfessionIds, 
  onProfessionsChange,
  maxSelections = 10 
}: SafeProfessionSelectorProps) => {
  const { categoriesWithProfessions, professions, loading, error, getLeadTierBadgeColor } = useProfessions();
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleProfession = (professionId: string) => {
    if (selectedProfessionIds.includes(professionId)) {
      onProfessionsChange(selectedProfessionIds.filter(id => id !== professionId));
    } else if (selectedProfessionIds.length < maxSelections) {
      onProfessionsChange([...selectedProfessionIds, professionId]);
    }
  };

  const removeProfession = (professionId: string) => {
    onProfessionsChange(selectedProfessionIds.filter(id => id !== professionId));
  };

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithProfessions;
    
    return categoriesWithProfessions
      .map(cat => ({
        ...cat,
        professions: cat.professions.filter(prof =>
          prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.keywords?.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }))
      .filter(cat => cat.professions.length > 0);
  }, [categoriesWithProfessions, searchQuery]);

  // Auto-expand categories with search results
  useMemo(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(filteredCategories.map(cat => cat.id)));
    }
  }, [searchQuery, filteredCategories]);

  const selectedProfessions = professions.filter(p => selectedProfessionIds.includes(p.id));

  // Check if any selected profession has industry-specific content
  const selectedIndustryContent = useMemo((): IndustryContentConfig | null => {
    for (const profession of selectedProfessions) {
      const category = categoriesWithProfessions.find(c => c.id === profession.industry_category_id);
      if (category) {
        const content = getIndustryContentByName(category.name);
        if (content) return content;
      }
    }
    return null;
  }, [selectedProfessions, categoriesWithProfessions]);

  // Tier badges removed - lead pricing is now determined at project level based on budget


  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load professions. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {/* Safety Disclaimer */}
      <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
          <strong>Platform Policy:</strong> Digs & Gigs supports unlicensed, creative, and business support services only. 
          Licensed legal, medical, mortgage, real estate, and contractor services are not permitted.
        </AlertDescription>
      </Alert>

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-auto min-h-12 justify-between hover:bg-accent touch-manipulation"
          >
            <div className="flex flex-wrap gap-1.5 flex-1">
              {selectedProfessions.length === 0 ? (
                <span className="text-muted-foreground">Select professions...</span>
              ) : (
                selectedProfessions.slice(0, 3).map(profession => (
                  <Badge
                    key={profession.id}
                    variant="secondary"
                    className="px-2 py-0.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProfession(profession.id);
                    }}
                  >
                    {profession.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              )}
              {selectedProfessions.length > 3 && (
                <Badge variant="outline" className="px-2 py-0.5 text-xs">
                  +{selectedProfessions.length - 3} more
                </Badge>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[95vw] max-w-[600px] p-0 z-50 max-h-[90vh] flex flex-col overflow-hidden" 
          align="start"
          sideOffset={8}
          side="bottom"
          avoidCollisions={true}
          collisionPadding={8}
        >
          {/* Search Header - Always visible at top */}
          <div className="flex-shrink-0 bg-background border-b p-3 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search professions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
          </div>

          {/* Categories List - Scrollable area */}
          <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch min-h-0" style={{ scrollBehavior: 'smooth' }}>
            {filteredCategories.length === 0 ? (
              <div className="px-4 py-6 text-center space-y-3">
                <div className="text-sm text-muted-foreground">
                  No professions found matching "{searchQuery}"
                </div>
                <p className="text-xs text-muted-foreground">
                  Can't find your profession? Use the "Request New Profession" form to submit a request.
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="border-b last:border-b-0">
                  {/* Category Header */}
                  <button
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 flex items-center justify-between hover:bg-accent/50 active:bg-accent transition-colors touch-manipulation min-h-[44px]"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="font-semibold text-sm truncate">{category.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {category.professions.length} professions
                    </span>
                  </button>

                  {/* Professions List */}
                  {expandedCategories.has(category.id) && (
                    <div className="bg-accent/5 divide-y">
                      {category.professions.map((profession) => {
                        const isSelected = selectedProfessionIds.includes(profession.id);
                        const isDisabled = !isSelected && selectedProfessionIds.length >= maxSelections;
                        
                        return (
                          <div
                            key={profession.id}
                            className={`px-3 sm:px-4 py-3 sm:py-2 pl-8 sm:pl-10 flex items-center justify-between gap-2 sm:gap-3 transition-colors touch-manipulation ${
                              isDisabled ? 'opacity-50' : 'hover:bg-accent/50 active:bg-accent'
                            }`}
                            onClick={() => !isDisabled && toggleProfession(profession.id)}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div 
                                className={`w-5 h-5 sm:w-4 sm:h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer touch-manipulation ${
                                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDisabled) toggleProfession(profession.id);
                                }}
                              >
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <span className="text-sm sm:text-sm break-words">{profession.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant={isSelected ? "secondary" : "default"}
                                className="h-8 sm:h-7 px-3 text-xs touch-manipulation"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProfession(profession.id);
                                }}
                                disabled={isDisabled}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer - Always visible at bottom */}
          <Separator className="flex-shrink-0" />
          <div className="flex-shrink-0 p-3 sm:p-3 bg-muted/30 space-y-3 bg-background border-t">
            {selectedProfessionIds.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedProfessionIds.length}/{maxSelections}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 sm:h-7 text-xs touch-manipulation min-h-[44px] sm:min-h-0"
                  onClick={() => onProfessionsChange([])}
                >
                  Clear all
                </Button>
              </div>
            )}
            <Button
              className="w-full min-h-[44px] sm:min-h-0 touch-manipulation"
              onClick={() => setOpen(false)}
              disabled={selectedProfessionIds.length === 0}
            >
              {selectedProfessionIds.length === 0 
                ? "Select at least one profession" 
                : `Select and Continue (${selectedProfessionIds.length})`}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Professions Display */}
      {selectedProfessions.length > 0 && (
        <div className="p-3 bg-accent/30 rounded-lg space-y-2">
          <h4 className="text-sm font-medium">Selected Professions:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedProfessions.map(profession => (
              <Badge 
                key={profession.id} 
                variant="secondary"
                className="px-2 py-1 flex items-center gap-1"
              >
                {profession.name}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive" 
                  onClick={() => removeProfession(profession.id)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Industry-Specific Content for Digger Signup */}
      {selectedIndustryContent?.diggerBlurb && (
        <Alert variant="default" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            {selectedIndustryContent.diggerBlurb.title}
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm whitespace-pre-line mt-2">
            {selectedIndustryContent.diggerBlurb.body}
          </AlertDescription>
        </Alert>
      )}

      {/* Industry Short Disclaimer */}
      {selectedIndustryContent?.disclaimer && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            {selectedIndustryContent.disclaimer}
          </AlertDescription>
        </Alert>
      )}

      {/* Industry Legal Disclaimer - Full compliance text rendered as visible HTML */}
      {selectedIndustryContent?.legalDisclaimer && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Disclaimer:</strong>{' '}
            {selectedIndustryContent.legalDisclaimer.replace('Disclaimer: ', '')}
          </p>
        </div>
      )}
    </div>
  );
};
