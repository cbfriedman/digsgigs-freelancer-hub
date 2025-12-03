import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, Plus, TrendingDown, DollarSign } from "lucide-react";
import { useState, useMemo } from "react";
import { GOOGLE_CPC_KEYWORDS, KeywordData } from "@/config/googleCpcKeywords";

interface KeywordWithCpc {
  keyword: string;
  cpc: number;
  industry: string;
  category: 'high-value' | 'mid-value' | 'low-value';
}

interface KeywordSuggestionsProps {
  suggestions?: string[];
  currentKeywords: string[];
  onAddKeyword: (keyword: string) => void;
  profession?: string;
  specialty?: string;
}

// Find matching keywords from database based on profession/specialty
const findMatchingKeywordsFromDatabase = (
  profession?: string,
  specialty?: string
): KeywordWithCpc[] => {
  const searchTerms = [
    profession?.toLowerCase() || '',
    specialty?.toLowerCase() || ''
  ].filter(Boolean);

  if (searchTerms.length === 0) return [];

  const matchedKeywords: KeywordWithCpc[] = [];

  for (const industryData of GOOGLE_CPC_KEYWORDS) {
    const industryLower = industryData.industry.toLowerCase();
    
    // Check if industry matches any search term
    const industryMatches = searchTerms.some(term => 
      industryLower.includes(term) || term.includes(industryLower.split(' ')[0])
    );

    // Also check keywords within the industry
    for (const keywordData of industryData.keywords) {
      const keywordLower = keywordData.keyword.toLowerCase();
      
      const keywordMatches = searchTerms.some(term => {
        // Direct match
        if (keywordLower.includes(term) || term.includes(keywordLower.split(' ')[0])) {
          return true;
        }
        // Check for common terms
        const termWords = term.split(' ');
        const keywordWords = keywordLower.split(' ');
        return termWords.some(tw => keywordWords.some(kw => 
          kw.includes(tw) || tw.includes(kw)
        ));
      });

      if (industryMatches || keywordMatches) {
        matchedKeywords.push({
          keyword: keywordData.keyword,
          cpc: keywordData.cpc,
          industry: industryData.industry,
          category: industryData.category
        });
      }
    }
  }

  // Sort by CPC (lowest first for affordability)
  return matchedKeywords.sort((a, b) => a.cpc - b.cpc);
};

export const KeywordSuggestions = ({
  suggestions = [],
  currentKeywords,
  onAddKeyword,
  profession,
  specialty
}: KeywordSuggestionsProps) => {
  const [showAll, setShowAll] = useState(false);

  // Get keywords from the database based on profession/specialty
  const databaseKeywords = useMemo(() => {
    return findMatchingKeywordsFromDatabase(profession, specialty);
  }, [profession, specialty]);

  // Filter out already selected keywords
  const availableKeywords = useMemo(() => {
    return databaseKeywords.filter(
      kw => !currentKeywords.some(
        current => current.toLowerCase() === kw.keyword.toLowerCase()
      )
    );
  }, [databaseKeywords, currentKeywords]);

  // Split into budget-friendly (lower CPC) and premium (higher CPC)
  const budgetKeywords = availableKeywords.filter(kw => kw.cpc <= 150);
  const premiumKeywords = availableKeywords.filter(kw => kw.cpc > 150);

  const displayedBudget = showAll ? budgetKeywords : budgetKeywords.slice(0, 6);
  const displayedPremium = showAll ? premiumKeywords : premiumKeywords.slice(0, 6);

  if (availableKeywords.length === 0) {
    return (
      <Card className="p-4 bg-muted/50 border-muted">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              No Keyword Suggestions Available
            </p>
            <p className="text-xs text-muted-foreground">
              No matching keywords found in our database for "{profession || specialty}". 
              Try selecting a different specialty or contact support to add keywords for your profession.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Budget-Friendly Keywords */}
      {displayedBudget.length > 0 && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-start gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-emerald-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Budget-Friendly Keywords
              </p>
              <p className="text-xs text-muted-foreground">
                Lower CPC keywords - great for maximizing lead volume
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {displayedBudget.map((kw, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddKeyword(kw.keyword)}
                className="h-auto py-1.5 px-3 text-xs hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                <span>{kw.keyword}</span>
                <span className="ml-2 text-emerald-600 font-semibold">${kw.cpc}</span>
              </Button>
            ))}
          </div>
          
          {budgetKeywords.length > 6 && !showAll && (
            <p className="text-xs text-muted-foreground mt-2">
              +{budgetKeywords.length - 6} more budget keywords
            </p>
          )}
        </Card>
      )}

      {/* Premium Keywords */}
      {displayedPremium.length > 0 && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-start gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-amber-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Premium Keywords
              </p>
              <p className="text-xs text-muted-foreground">
                Higher CPC keywords - typically higher-value leads
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {displayedPremium.map((kw, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddKeyword(kw.keyword)}
                className="h-auto py-1.5 px-3 text-xs hover:bg-amber-500/10 hover:text-amber-700 hover:border-amber-500 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                <span>{kw.keyword}</span>
                <span className="ml-2 text-amber-600 font-semibold">${kw.cpc}</span>
              </Button>
            ))}
          </div>
          
          {premiumKeywords.length > 6 && !showAll && (
            <p className="text-xs text-muted-foreground mt-2">
              +{premiumKeywords.length - 6} more premium keywords
            </p>
          )}
        </Card>
      )}

      {/* Show All Button */}
      {(budgetKeywords.length > 6 || premiumKeywords.length > 6) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs"
        >
          {showAll 
            ? 'Show Less' 
            : `Show All ${budgetKeywords.length + premiumKeywords.length} Available Suggestions`}
        </Button>
      )}
    </div>
  );
};
