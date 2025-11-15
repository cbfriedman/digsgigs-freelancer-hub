import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

interface IndustryCodeLookupProps {
  onSelect: (code: IndustryCode, customTitle: string) => void;
  selectedCode?: IndustryCode | null;
  customTitle?: string;
}

export const IndustryCodeLookup: React.FC<IndustryCodeLookupProps> = ({
  onSelect,
  selectedCode,
  customTitle = "",
}) => {
  const [codeType, setCodeType] = useState<"SIC" | "NAICS">("NAICS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IndustryCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualTitle, setManualTitle] = useState(customTitle);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("industry_codes")
        .select("*")
        .eq("code_type", codeType)
        .or(`code.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      setSearchResults((data as IndustryCode[]) || []);
      if (data?.length === 0) {
        toast.info("No codes found. Try a different search or enter your code manually.");
      }
    } catch (error) {
      console.error("Error searching codes:", error);
      toast.error("Failed to search codes");
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    if (!manualCode.trim() || !manualTitle.trim()) {
      toast.error("Please enter both code and occupation title");
      return;
    }

    const customCode: IndustryCode = {
      id: `custom-${manualCode}`,
      code_type: codeType,
      code: manualCode,
      title: manualTitle,
      description: null,
    };

    onSelect(customCode, manualTitle);
    toast.success("Custom occupation added");
  };

  const handleClearSelection = () => {
    setManualCode("");
    setManualTitle("");
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold mb-3 block">Select Code Type</Label>
          <RadioGroup value={codeType} onValueChange={(val) => setCodeType(val as "SIC" | "NAICS")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="NAICS" id="naics" />
              <Label htmlFor="naics" className="cursor-pointer font-normal">
                NAICS (North American Industry Classification System)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SIC" id="sic" />
              <Label htmlFor="sic" className="cursor-pointer font-normal">
                SIC (Standard Industrial Classification)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {selectedCode && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{selectedCode.code_type}: {selectedCode.code}</Badge>
                  </div>
                  <p className="font-semibold text-sm">{customTitle || selectedCode.title}</p>
                  {selectedCode.description && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedCode.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Label className="text-base font-semibold">Search by Code or Occupation</Label>
          <div className="flex gap-2">
            <Input
              placeholder={`Search ${codeType} codes or titles...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {searchResults.map((code) => (
                <button
                  key={code.id}
                  onClick={() => {
                    onSelect(code, code.title);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  className="w-full text-left p-3 hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {code.code_type}: {code.code}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{code.title}</p>
                  {code.description && (
                    <p className="text-xs text-muted-foreground mt-1">{code.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Label className="text-base font-semibold mb-3 block">Or Enter Manually</Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="manual-code" className="text-sm">
                {codeType} Code
              </Label>
              <Input
                id="manual-code"
                placeholder={`e.g., ${codeType === "NAICS" ? "541511" : "7371"}`}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="manual-title" className="text-sm">
                Occupation Title
              </Label>
              <Input
                id="manual-title"
                placeholder="e.g., Software Developer"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>
            <Button onClick={handleManualEntry} variant="secondary" className="w-full">
              Add Custom Occupation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryCodeLookup;
