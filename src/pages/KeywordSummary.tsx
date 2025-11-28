import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Info } from "lucide-react";
import { getLeadCostForIndustry } from "@/config/pricing";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GOOGLE_CPC_KEYWORDS } from "@/config/googleCpcKeywords";

interface SelectedKeyword {
  keyword: string;
  industry: string;
}

interface LeadSelection {
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
}

export default function KeywordSummary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<SelectedKeyword[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [selections, setSelections] = useState<Map<string, LeadSelection>>(new Map());
  
  // Get profileId from URL params if available
  const searchParams = new URLSearchParams(window.location.search);
  const profileId = searchParams.get('profileId');

  useEffect(() => {
    const savedData = sessionStorage.getItem('selectedKeywords');
    if (savedData) {
      const data = JSON.parse(savedData);
      const loadedKeywords = data.keywords || [];
      setKeywords(loadedKeywords);
      setCategoryName(data.categoryName || "");
      
      // Initialize selections with default values
      const initialSelections = new Map<string, LeadSelection>();
      loadedKeywords.forEach((kw: SelectedKeyword) => {
      initialSelections.set(kw.keyword, {
        keyword: kw.keyword,
        industry: kw.industry,
        exclusivity: 'non-exclusive',
        quantity: 0
      });
      });
      setSelections(initialSelections);
    } else {
      // No keywords selected, redirect back
      navigate('/pricing');
    }
  }, [navigate]);

  // Function to lookup Google CPC for a keyword
  const lookupGoogleCPC = (keyword: string, industry: string): number => {
    // Search through all industry categories in GOOGLE_CPC_KEYWORDS
    for (const industryData of GOOGLE_CPC_KEYWORDS) {
      const keywordData = industryData.keywords.find(
        kw => kw.keyword.toLowerCase() === keyword.toLowerCase()
      );
      if (keywordData) {
        return keywordData.cpc;
      }
    }
    // Default fallback CPC if not found
    return 45; // Average CPC as fallback
  };

  const updateSelection = (keyword: string, field: 'exclusivity' | 'quantity', value: any) => {
    setSelections(prev => {
      const newSelections = new Map(prev);
      const current = newSelections.get(keyword);
      if (current) {
        newSelections.set(keyword, { ...current, [field]: value });
      }
      return newSelections;
    });
  };

  const calculateGrandTotal = () => {
    let total = 0;
    selections.forEach(selection => {
      const pricePerLead = getLeadCostForIndustry(selection.industry, selection.exclusivity);
      total += pricePerLead * selection.quantity;
    });
    return total;
  };

  const handleProceedToCheckout = () => {
    const leadPurchases = Array.from(selections.values()).filter(s => s.quantity > 0);
    
    if (leadPurchases.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to purchase",
        variant: "destructive"
      });
      return;
    }
    
    // Save lead purchase selections to sessionStorage
    sessionStorage.setItem('leadPurchaseSelections', JSON.stringify(leadPurchases));
    
    toast({
      title: "Proceeding to Checkout",
      description: `${leadPurchases.length} lead type${leadPurchases.length !== 1 ? 's' : ''} ready for purchase`,
    });
    
    navigate('/checkout');
  };

  if (keywords.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(profileId ? `/digger/${profileId}` : '/pricing')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Keyword Selection
            </Button>
            <h1 className="text-4xl font-bold mb-2">
              Selected Keywords Summary
            </h1>
            {categoryName && (
              <p className="text-lg text-muted-foreground">
                Category: {categoryName}
              </p>
            )}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Configure Your Lead Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {keywords.map(({ keyword, industry }, index) => {
                  const selection = selections.get(keyword);
                  if (!selection) return null;

                  const googleCPC = lookupGoogleCPC(keyword, industry);
                  const pricePerLead = getLeadCostForIndustry(industry, selection.exclusivity);
                  const nonExclusivePrice = getLeadCostForIndustry(industry, 'non-exclusive');
                  const subtotal = pricePerLead * selection.quantity;

                  return (
                    <div key={index} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{keyword}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            <span>Google CPC: <span className="font-semibold text-foreground">${googleCPC.toFixed(2)}</span></span>
                            <Badge variant="outline" className="ml-2">
                              Non-Exclusive: ${nonExclusivePrice.toFixed(2)} (20% of CPC)
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`exclusivity-${index}`}>Exclusivity Type</Label>
                          <Select
                            value={selection.exclusivity}
                            onValueChange={(value: any) => updateSelection(keyword, 'exclusivity', value)}
                          >
                            <SelectTrigger id={`exclusivity-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non-exclusive">
                                Non-Exclusive - ${getLeadCostForIndustry(industry, 'non-exclusive').toFixed(2)}/lead
                              </SelectItem>
                              <SelectItem value="semi-exclusive">
                                Semi-Exclusive - ${getLeadCostForIndustry(industry, 'semi-exclusive').toFixed(2)}/lead
                              </SelectItem>
                              <SelectItem value="exclusive-24h">
                                24hr Exclusive - ${getLeadCostForIndustry(industry, 'exclusive-24h').toFixed(2)}/lead
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`quantity-${index}`}>Number of Leads</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="0"
                            value={selection.quantity}
                            onChange={(e) => updateSelection(keyword, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="w-full">
                            <Label>Subtotal</Label>
                            <div className="text-2xl font-bold text-primary">
                              ${subtotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Grand Total</p>
                  <p className="text-3xl font-bold text-primary">
                    ${calculateGrandTotal().toFixed(2)}
                  </p>
                </div>
                <Button onClick={handleProceedToCheckout} size="lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={() => navigate(profileId ? `/digger/${profileId}` : '/pricing')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Keyword Selection
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
