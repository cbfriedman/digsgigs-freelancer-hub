import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GOOGLE_CPC_KEYWORDS, calculateExclusiveLeadPrice, calculateNonExclusiveLeadPrice } from "@/config/googleCpcKeywords";
import { Target, TrendingUp } from "lucide-react";
import { ProfessionRequestForm } from "./ProfessionRequestForm";

// Reorganize data into hierarchical structure
const organizeByIndustry = () => {
  const industryMap: Record<string, typeof GOOGLE_CPC_KEYWORDS> = {
    "Legal Services": [],
    "Insurance & Financial Services": [],
    "Construction & Home Services": [],
    "Medical & Healthcare": [],
    "Technology Services": [],
    "Business Services": [],
    "Automotive Services": [],
    "Pet Care": [],
    "Education & Tutoring": [],
    "Fitness & Wellness": [],
    "Event Services": [],
    "Cleaning & Maintenance": [],
    "Moving & Storage": [],
    "Beauty & Personal Care": []
  };

  GOOGLE_CPC_KEYWORDS.forEach(item => {
    const industry = item.industry.toLowerCase();
    
    // Legal Services
    if (industry.includes("law") || industry.includes("legal") || industry.includes("lawyer") || 
        industry.includes("attorney") || industry.includes("bankruptcy") || industry.includes("immigration") ||
        industry.includes("employment") || industry.includes("estate planning") || industry.includes("real estate law")) {
      industryMap["Legal Services"].push(item);
    } 
    // Insurance & Financial
    else if (industry.includes("insurance") || industry.includes("loan") || industry.includes("mortgage") || 
             industry.includes("refinancing") || industry.includes("trading") || industry.includes("business loan")) {
      industryMap["Insurance & Financial Services"].push(item);
    } 
    // Construction & Home Services
    else if (industry.includes("plumb") || industry.includes("hvac") || industry.includes("roof") || 
             industry.includes("electrical") || industry.includes("contractor") || industry.includes("kitchen") ||
             industry.includes("bathroom") || industry.includes("landscaping") || industry.includes("remodeling")) {
      industryMap["Construction & Home Services"].push(item);
    } 
    // Medical & Healthcare
    else if (industry.includes("treatment") || industry.includes("rehab") || industry.includes("medical") || 
             industry.includes("health") || industry.includes("dental") || industry.includes("cosmetic surgery") ||
             industry.includes("surgery")) {
      industryMap["Medical & Healthcare"].push(item);
    }
    // Technology Services
    else if (industry.includes("web") || industry.includes("seo") || industry.includes("digital") ||
             industry.includes("marketing") || industry.includes("development")) {
      industryMap["Technology Services"].push(item);
    }
    // Business Services
    else if (industry.includes("accounting") || industry.includes("cpa") || industry.includes("tax") ||
             industry.includes("bookkeeping") || industry.includes("payroll")) {
      industryMap["Business Services"].push(item);
    }
    // Automotive Services
    else if (industry.includes("auto") || industry.includes("car") || industry.includes("vehicle") ||
             industry.includes("body") || industry.includes("paint")) {
      industryMap["Automotive Services"].push(item);
    }
    // Pet Care
    else if (industry.includes("pet") || industry.includes("dog") || industry.includes("cat") ||
             industry.includes("animal") || industry.includes("grooming")) {
      industryMap["Pet Care"].push(item);
    }
    // Education & Tutoring
    else if (industry.includes("tutor") || industry.includes("lessons") || industry.includes("music") ||
             industry.includes("education") || industry.includes("teaching")) {
      industryMap["Education & Tutoring"].push(item);
    }
    // Fitness & Wellness
    else if (industry.includes("training") || industry.includes("fitness") || industry.includes("massage") ||
             industry.includes("yoga") || industry.includes("wellness") || industry.includes("coach")) {
      industryMap["Fitness & Wellness"].push(item);
    }
    // Event Services
    else if (industry.includes("wedding") || industry.includes("event") || industry.includes("party") ||
             industry.includes("photography") || industry.includes("photographer")) {
      industryMap["Event Services"].push(item);
    }
    // Cleaning & Maintenance
    else if (industry.includes("cleaning") || industry.includes("clean") || industry.includes("maid") ||
             industry.includes("janitorial")) {
      industryMap["Cleaning & Maintenance"].push(item);
    }
    // Moving & Storage
    else if (industry.includes("moving") || industry.includes("movers") || industry.includes("storage") ||
             industry.includes("relocation")) {
      industryMap["Moving & Storage"].push(item);
    }
    // Beauty & Personal Care
    else if (industry.includes("hair") || industry.includes("salon") || industry.includes("beauty") ||
             industry.includes("barber") || industry.includes("stylist")) {
      industryMap["Beauty & Personal Care"].push(item);
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

        {/* Profession Request Form */}
        <div className="mt-6 pt-6 border-t">
          <ProfessionRequestForm />
        </div>
      </CardContent>
    </Card>
  );
};
