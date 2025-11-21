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
      {/* Profile Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="profile-title">Profile Title</Label>
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
          {title.length}/60 characters
        </p>
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="tagline">Tagline</Label>
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
          {tagline.length}/100 characters
        </p>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="p-4 border rounded-lg bg-accent/5 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Suggestions for {currentType === 'title' ? 'Title' : 'Tagline'}
          </h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors border"
              >
                <p className="text-sm">{suggestion}</p>
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSuggestions(false);
              setSuggestions([]);
            }}
          >
            Close Suggestions
          </Button>
        </div>
      )}
    </div>
  );
};
