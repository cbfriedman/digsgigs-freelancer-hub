import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_CPC_KEYWORDS, calculateExclusiveLeadPrice, calculateNonExclusiveLeadPrice } from "@/config/googleCpcKeywords";
import { Target, TrendingUp } from "lucide-react";

// Reorganize data into hierarchical structure
const organizeByIndustry = () => {
  const industryMap: Record<string, typeof GOOGLE_CPC_KEYWORDS> = {
    "Legal Services": [],
    "Insurance & Financial": [],
    "Home Services": [],
    "Healthcare": []
  };

  GOOGLE_CPC_KEYWORDS.forEach(item => {
    if (item.industry.includes("Law") || item.industry.includes("Legal") || item.industry.includes("Lawyer") || item.industry.includes("Attorney")) {
      industryMap["Legal Services"].push(item);
    } else if (item.industry.includes("Insurance") || item.industry.includes("Loan") || item.industry.includes("Mortgage") || item.industry.includes("Trading")) {
      industryMap["Insurance & Financial"].push(item);
    } else if (item.industry.includes("Plumb") || item.industry.includes("HVAC") || item.industry.includes("Roof") || item.industry.includes("Contractor")) {
      industryMap["Home Services"].push(item);
    } else if (item.industry.includes("Treatment") || item.industry.includes("Rehab") || item.industry.includes("Medical") || item.industry.includes("Health")) {
      industryMap["Healthcare"].push(item);
    }
  });

  return industryMap;
};

export const IndustryProfessionSelector = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");

  const industryData = organizeByIndustry();
  const industries = Object.keys(industryData).filter(key => industryData[key].length > 0);
  
  const professions = selectedIndustry ? industryData[selectedIndustry] : [];
  const selectedProfessionData = professions.find(p => p.industry === selectedProfession);
  const specialties = selectedProfessionData?.keywords || [];
  const selectedSpecialtyData = specialties.find(s => s.keyword === selectedSpecialty);

  const avgCpc = selectedProfessionData?.averageCpc || 0;
  const highestCpc = selectedProfessionData ? Math.max(...selectedProfessionData.keywords.map(k => k.cpc)) : 0;
  const exclusivePrice = calculateExclusiveLeadPrice(avgCpc);
  const nonExclusivePrice = calculateNonExclusiveLeadPrice(avgCpc);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <CardTitle>Industry-Based Lead Pricing</CardTitle>
        </div>
        <CardDescription>
          Select your industry, profession, and specialty to see pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Value Proposition */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            DigsandGigs Advantage
          </h4>
          <p className="text-sm text-muted-foreground">
            Our exclusive leads are priced at just <span className="font-semibold text-foreground">1.2x the average CPC</span> for 
            your specialty—offering transparent, value-based pricing. Compare to the highest CPC in your category to see the savings.
          </p>
        </div>

        {/* Industry Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Step 1: Select Industry</label>
          <Select value={selectedIndustry} onValueChange={(value) => {
            setSelectedIndustry(value);
            setSelectedProfession("");
            setSelectedSpecialty("");
          }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Choose an industry category..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry} ({industryData[industry].length} professions)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Profession Selection */}
        {selectedIndustry && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Step 2: Select Profession</label>
            <Select value={selectedProfession} onValueChange={(value) => {
              setSelectedProfession(value);
              setSelectedSpecialty("");
            }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose a profession..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {professions.map((profession) => (
                  <SelectItem key={profession.industry} value={profession.industry}>
                    {profession.industry}
                    <Badge variant="secondary" className="ml-2">
                      Avg: ${profession.averageCpc}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Specialty Selection */}
        {selectedProfession && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Step 3: Select Specialty</label>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose a specialty..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[300px]">
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.keyword} value={specialty.keyword}>
                    {specialty.keyword}
                    <Badge variant="outline" className="ml-2">
                      ${specialty.cpc} CPC
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pricing Display */}
        {selectedProfession && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Average CPC</div>
              <div className="text-2xl font-bold">${avgCpc}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Highest CPC</div>
              <div className="text-2xl font-bold">${highestCpc}</div>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary">
              <div className="text-sm text-muted-foreground mb-1">Our Exclusive</div>
              <div className="text-2xl font-bold text-primary">${exclusivePrice.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">1.2x Avg CPC</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Non-Exclusive</div>
              <div className="text-2xl font-bold">${nonExclusivePrice.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">20% of Avg CPC</div>
            </div>
          </div>
        )}

        {/* Specialty Details */}
        {selectedSpecialtyData && (
          <div className="border rounded-lg p-4 bg-accent/5">
            <h4 className="font-semibold mb-3">Specialty Details: {selectedSpecialtyData.keyword}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Google CPC:</span>
                <span className="font-semibold ml-2">${selectedSpecialtyData.cpc.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Searches:</span>
                <span className="font-semibold ml-2">{selectedSpecialtyData.searchVolume.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Competition:</span>
                <Badge 
                  variant={
                    selectedSpecialtyData.competitionLevel === 'high' ? 'destructive' :
                    selectedSpecialtyData.competitionLevel === 'medium' ? 'default' : 
                    'secondary'
                  }
                  className="ml-2"
                >
                  {selectedSpecialtyData.competitionLevel}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
