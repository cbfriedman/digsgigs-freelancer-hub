import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";

interface KeywordSelectorProps {
  suggestedKeywords: string[];
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
}

export const KeywordSelector = ({
  suggestedKeywords,
  selectedKeywords,
  onToggleKeyword
}: KeywordSelectorProps) => {
  if (suggestedKeywords.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        Click to select keywords for your profile:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestedKeywords.map((keyword, index) => {
          const isSelected = selectedKeywords.includes(keyword);
          return (
            <Button
              key={index}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleKeyword(keyword)}
              className="h-auto py-1.5 px-3 text-xs transition-colors"
            >
              {isSelected ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              <span>{keyword}</span>
            </Button>
          );
        })}
      </div>
      {selectedKeywords.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Selected: {selectedKeywords.length} keywords
          </p>
        </div>
      )}
    </div>
  );
};
