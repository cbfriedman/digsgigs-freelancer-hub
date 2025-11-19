import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { lookupCPC, findSimilarKeywords } from "@/utils/cpcLookup";
import { PRICING_TIERS } from "@/config/pricing";

interface Profession {
  keyword: string;
  cpl: {
    free: number;
    pro: number;
    premium: number;
  };
  valueIndicator: string;
}

interface ProfessionKeywordInputProps {
  professions: Profession[];
  onProfessionsChange: (professions: Profession[]) => void;
}

export function ProfessionKeywordInput({ professions, onProfessionsChange }: ProfessionKeywordInputProps) {
  const [input, setInput] = useState("");

  const calculateCPL = (keyword: string) => {
    const cpcData = lookupCPC(keyword) || findSimilarKeywords(keyword, 1)[0];
    const baseCPC = cpcData?.estimatedCPC || 15; // Default if not found
    
    return {
      free: Math.round(baseCPC * 3),
      pro: Math.round(baseCPC * 2.5),
      premium: Math.round(baseCPC * 2),
    };
  };

  const getValueIndicator = (keyword: string): string => {
    const cpcData = lookupCPC(keyword) || findSimilarKeywords(keyword, 1)[0];
    if (!cpcData) return "Mid Value";
    
    return cpcData.valueIndicator === 'low-value' ? 'Low Value' : 
           cpcData.valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
  };

  const addProfession = () => {
    if (!input.trim()) return;
    
    // Check if already added
    if (professions.some(p => p.keyword.toLowerCase() === input.trim().toLowerCase())) {
      setInput("");
      return;
    }

    const newProfession: Profession = {
      keyword: input.trim(),
      cpl: calculateCPL(input.trim()),
      valueIndicator: getValueIndicator(input.trim()),
    };

    onProfessionsChange([...professions, newProfession]);
    setInput("");
  };

  const removeProfession = (keyword: string) => {
    onProfessionsChange(professions.filter(p => p.keyword !== keyword));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Type profession or keyword (e.g., 'plumber', 'web designer')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addProfession();
            }
          }}
        />
        <Button
          type="button"
          onClick={addProfession}
          disabled={!input.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {professions.length > 0 && (
        <div className="space-y-2">
          {professions.map((prof) => (
            <div
              key={prof.keyword}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{prof.keyword}</span>
                  <Badge variant="outline" className="text-xs">
                    {prof.valueIndicator}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Free: ${prof.cpl.free}/lead • Pro: ${prof.cpl.pro}/lead • Premium: ${prof.cpl.premium}/lead
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeProfession(prof.keyword)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
