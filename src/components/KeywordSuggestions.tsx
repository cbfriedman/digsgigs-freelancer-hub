import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, Plus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface KeywordSuggestionsProps {
  suggestions: string[];
  currentKeywords: string[];
  onAddKeyword: (keyword: string) => void;
  profession?: string;
}

export const KeywordSuggestions = ({
  suggestions,
  currentKeywords,
  onAddKeyword,
  profession
}: KeywordSuggestionsProps) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestSuggestions = async () => {
    if (!profession) {
      toast.error("Please enter a profession first");
      return;
    }

    setIsRequesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-keyword-suggestions', {
        body: { profession }
      });

      if (error) throw error;

      if (data?.alreadyExists) {
        toast.info("A request for this profession is already being processed");
      } else {
        toast.success("Request submitted! We'll add suggestions for this profession soon.");
      }
    } catch (error) {
      console.error('Error requesting suggestions:', error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };
  // Filter out keywords that are already added
  const availableSuggestions = suggestions.filter(
    suggestion => !currentKeywords.some(
      kw => kw.toLowerCase() === suggestion.toLowerCase()
    )
  );

  if (availableSuggestions.length === 0 && suggestions.length === 0) {
    return (
      <Card className="p-4 bg-muted/50 border-muted">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              No Keyword Suggestions Available
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              We don't have pre-defined suggestions for this profession yet. Please add your own custom keywords that describe your services and expertise.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestSuggestions}
              disabled={isRequesting}
              className="h-8 text-xs"
            >
              <Send className="h-3 w-3 mr-1" />
              {isRequesting ? "Submitting..." : "Request Keywords for This Profession"}
            </Button>
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
