import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileTitleTaglineEditorProps {
  title: string;
  tagline: string;
  onTitleChange: (title: string) => void;
  onTaglineChange: (tagline: string) => void;
  companyName: string;
  profession?: string;
  keywords?: string[];
}

export const ProfileTitleTaglineEditor = ({
  title,
  tagline,
  onTitleChange,
  onTaglineChange,
  companyName,
  profession,
  keywords
}: ProfileTitleTaglineEditorProps) => {
  const [generating, setGenerating] = useState<'title' | 'tagline' | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentType, setCurrentType] = useState<'title' | 'tagline'>('title');
  const { toast } = useToast();

  const generateSuggestions = async (type: 'title' | 'tagline') => {
    try {
      setGenerating(type);
      setCurrentType(type);
      setShowSuggestions(true);
      
      const { data, error } = await supabase.functions.invoke('generate-profile-suggestions', {
        body: {
          companyName,
          profession,
          keywords,
          type
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (currentType === 'title') {
      onTitleChange(suggestion);
    } else {
      onTaglineChange(suggestion);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      {/* Profile Title (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-title">
            Profile Title <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => generateSuggestions('title')}
            disabled={!!generating || !companyName}
          >
            {generating === 'title' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Suggest
              </>
            )}
          </Button>
        </div>
        <Input
          id="profile-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Elite Plumbing - Your Trusted Local Experts"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          A catchy headline for your profile. {title.length}/60 characters
        </p>
      </div>

      {/* Tagline (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="tagline">
            Tagline <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => generateSuggestions('tagline')}
            disabled={!!generating || !companyName}
          >
            {generating === 'tagline' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Suggest
              </>
            )}
          </Button>
        </div>
        <Textarea
          id="tagline"
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          placeholder="e.g., Quality service you can trust, every time"
          maxLength={100}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          A short slogan or motto. {tagline.length}/100 characters
        </p>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && (
        <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-3 shadow-md">
          <h4 className="text-base font-semibold flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            AI Suggestions for {currentType === 'title' ? 'Title' : 'Tagline'}
          </h4>
          {generating ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Generating suggestions...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="w-full text-left p-3 rounded-md hover:bg-primary/10 transition-colors border-2 border-border hover:border-primary bg-background"
                  >
                    <p className="text-sm font-medium">{suggestion}</p>
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSuggestions(false);
                  setSuggestions([]);
                }}
                className="w-full"
              >
                Close Suggestions
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No suggestions generated. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
