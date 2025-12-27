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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IndustryCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCodeType, setManualCodeType] = useState<"SIC" | "NAICS">("NAICS");
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
        .or(`code.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(40);

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
      code_type: manualCodeType,
      code: manualCode,
      title: manualTitle,
      description: null,
    };

    onSelect(customCode, manualTitle);
    toast.success("Custom occupation added");
    setShowManualEntry(false);
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
          <Label className="text-base font-semibold mb-3 block">Search for Your Occupation</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Enter your profession to see all related industry codes
          </p>
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
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Software Developer, Plumber, Accountant..."
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
          <p className="text-sm text-muted-foreground">
            Can't find your occupation? Contact support to request it be added to our approved list.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IndustryCodeLookup;
