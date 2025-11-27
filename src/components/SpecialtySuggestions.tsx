import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, Plus } from "lucide-react";
import { getSpecialtySuggestions } from "@/utils/keywordSuggestions";

interface SpecialtySuggestionsProps {
  profession: string;
  currentSpecialties: string[];
  onAddSpecialty: (specialty: string) => void;
  onRequestCustom?: () => void;
}

export const SpecialtySuggestions = ({
  profession,
  currentSpecialties,
  onAddSpecialty,
  onRequestCustom
}: SpecialtySuggestionsProps) => {
  const suggestions = getSpecialtySuggestions(profession);
  
  // Filter out specialties that are already added
  const availableSuggestions = suggestions.filter(
    suggestion => !currentSpecialties.some(
      sp => sp.toLowerCase() === suggestion.toLowerCase()
    )
  );

  if (availableSuggestions.length === 0 && suggestions.length === 0) {
    return (
      <Card className="p-4 bg-muted/50 border-muted">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              No Specialty Suggestions Available
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              We don't have pre-defined specialty suggestions for this profession yet. Add your own custom specialties.
            </p>
            {onRequestCustom && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRequestCustom}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Request Custom Specialty
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (availableSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-accent/20 border-primary/20">
      <div className="flex items-start gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground mb-1">
            Suggested Specialties
          </p>
          <p className="text-xs text-muted-foreground">
            Click to add relevant specialties to your profile
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableSuggestions.slice(0, 8).map((suggestion, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddSpecialty(suggestion)}
            className="h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Button>
        ))}
      </div>
      
      {availableSuggestions.length > 8 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{availableSuggestions.length - 8} more suggestions
        </p>
      )}
      
      {onRequestCustom && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRequestCustom}
          className="h-7 text-xs mt-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Request Custom Specialty
        </Button>
      )}
    </Card>
  );
};
