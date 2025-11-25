import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { GOOGLE_CPC_KEYWORDS, calculateExclusiveLeadPrice, calculateNonExclusiveLeadPrice } from "@/config/googleCpcKeywords";

interface KeywordMatch {
  keyword: string;
  industry: string;
  cpc: number;
  exclusivePrice: number;
  nonExclusivePrice: number;
  selected: boolean;
}

export const AIPoweredKeywordInput = () => {
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [matches, setMatches] = useState<KeywordMatch[]>([]);

  const findMatchingKeywords = (aiKeywords: string[]) => {
    const foundMatches: KeywordMatch[] = [];
    
    // Search through our database for matching keywords
    GOOGLE_CPC_KEYWORDS.forEach(industry => {
      industry.keywords.forEach(kw => {
        // Check if any AI-suggested keyword matches or is similar to our database keywords
        const isMatch = aiKeywords.some(aiKw => {
          const aiLower = aiKw.toLowerCase();
          const kwLower = kw.keyword.toLowerCase();
          return kwLower.includes(aiLower) || aiLower.includes(kwLower);
        });

        if (isMatch && !foundMatches.find(m => m.keyword === kw.keyword)) {
          foundMatches.push({
            keyword: kw.keyword,
            industry: industry.industry,
            cpc: kw.cpc,
            exclusivePrice: calculateExclusiveLeadPrice(kw.cpc),
            nonExclusivePrice: calculateNonExclusiveLeadPrice(kw.cpc),
            selected: false
          });
        }
      });
    });

    return foundMatches;
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      toast.error("Please describe your specialty");
      return;
    }

    setIsAnalyzing(true);
    setSuggestedKeywords([]);
    setMatches([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-keywords-from-description', {
        body: { description: description.trim() }
      });

      if (error) {
        throw error;
      }

      if (data?.keywords) {
        setSuggestedKeywords(data.keywords);
        const foundMatches = findMatchingKeywords(data.keywords);
        setMatches(foundMatches);
        
        if (foundMatches.length === 0) {
          toast.info("No exact matches found in our database. Try describing your specialty differently or contact us to add your profession.");
        } else {
          toast.success(`Found ${foundMatches.length} matching keywords!`);
        }
      }
    } catch (error) {
      console.error("Error analyzing description:", error);
      toast.error("Failed to analyze description. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleKeyword = (index: number) => {
    setMatches(prev => prev.map((m, i) => 
      i === index ? { ...m, selected: !m.selected } : m
    ));
  };

  const selectedMatches = matches.filter(m => m.selected);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>AI-Powered Keyword Suggestions</CardTitle>
        </div>
        <CardDescription>
          Describe your business or specialty, and we'll suggest relevant keywords with pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Describe your specialty or business
          </label>
          <Textarea
            placeholder="Example: I fix air conditioning units and install new HVAC systems for homes and small businesses..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !description.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get Keyword Suggestions
              </>
            )}
          </Button>
        </div>

        {/* AI Suggested Keywords */}
        {suggestedKeywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">AI Suggestions:</h4>
            <div className="flex flex-wrap gap-2">
              {suggestedKeywords.map((keyword, i) => (
                <Badge key={i} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Matching Keywords with Pricing */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Matching Keywords in Our Database ({matches.length} found):
            </h4>
            <div className="space-y-2">
              {matches.map((match, index) => (
                <div
                  key={index}
                  onClick={() => toggleKeyword(index)}
                  className={`cursor-pointer border rounded-lg p-4 transition-all ${
                    match.selected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {match.selected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        <h5 className="font-semibold">{match.keyword}</h5>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {match.industry}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          Google CPC: ${match.cpc}
                        </Badge>
                        <Badge variant="secondary">
                          Exclusive: ${match.exclusivePrice}
                        </Badge>
                        <Badge variant="secondary">
                          Non-Exclusive: ${match.nonExclusivePrice}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Summary */}
        {selectedMatches.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">
              Selected Keywords ({selectedMatches.length}):
            </h4>
            <div className="space-y-2">
              {selectedMatches.map((match, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span>{match.keyword}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Excl: ${match.exclusivePrice}</Badge>
                    <Badge variant="outline">Non: ${match.nonExclusivePrice}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
