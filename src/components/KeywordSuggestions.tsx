import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, Plus } from "lucide-react";

interface KeywordSuggestionsProps {
  suggestions: string[];
  currentKeywords: string[];
  onAddKeyword: (keyword: string) => void;
}

export const KeywordSuggestions = ({
  suggestions,
  currentKeywords,
  onAddKeyword
}: KeywordSuggestionsProps) => {
  // Filter out keywords that are already added
  const availableSuggestions = suggestions.filter(
    suggestion => !currentKeywords.some(
      kw => kw.toLowerCase() === suggestion.toLowerCase()
    )
  );

  if (availableSuggestions.length === 0 && suggestions.length === 0) {
    return (
      <Card className="p-4 bg-muted/50 border-muted">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              No Keyword Suggestions Available
            </p>
            <p className="text-xs text-muted-foreground">
              We don't have pre-defined suggestions for this profession yet. Please add your own custom keywords that describe your services and expertise.
            </p>
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
            Suggested Keywords
          </p>
          <p className="text-xs text-muted-foreground">
            Click to add relevant keywords to your profile
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableSuggestions.slice(0, 12).map((suggestion, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddKeyword(suggestion)}
            className="h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Button>
        ))}
      </div>
      
      {availableSuggestions.length > 12 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{availableSuggestions.length - 12} more suggestions
        </p>
      )}
    </Card>
  );
};
