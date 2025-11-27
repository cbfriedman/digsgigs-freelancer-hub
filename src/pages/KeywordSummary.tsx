import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLeadCostForIndustry } from "@/config/pricing";

interface SelectedKeyword {
  keyword: string;
  industry: string;
}

export default function KeywordSummary() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<SelectedKeyword[]>([]);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const savedData = sessionStorage.getItem('selectedKeywords');
    if (savedData) {
      const data = JSON.parse(savedData);
      setKeywords(data.keywords || []);
      setCategoryName(data.categoryName || "");
    } else {
      // No keywords selected, redirect back
      navigate('/pricing');
    }
  }, [navigate]);

  const calculateTotals = () => {
    let nonExclusiveTotal = 0;
    let semiExclusiveTotal = 0;
    let exclusiveTotal = 0;

    keywords.forEach(({ industry }) => {
      nonExclusiveTotal += getLeadCostForIndustry(industry, 'non-exclusive');
      semiExclusiveTotal += getLeadCostForIndustry(industry, 'semi-exclusive');
      exclusiveTotal += getLeadCostForIndustry(industry, 'exclusive-24h');
    });

    return { nonExclusiveTotal, semiExclusiveTotal, exclusiveTotal };
  };

  const totals = calculateTotals();

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
              onClick={() => navigate('/pricing')}
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
              <CardTitle>Keyword Pricing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keywords.map(({ keyword, industry }, index) => {
                  const nonExclusive = getLeadCostForIndustry(industry, 'non-exclusive');
                  const semiExclusive = getLeadCostForIndustry(industry, 'semi-exclusive');
                  const exclusive = getLeadCostForIndustry(industry, 'exclusive-24h');

                  return (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <h3 className="font-semibold text-lg mb-2">{keyword}</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Non-Exclusive</p>
                          <p className="font-bold text-primary">${nonExclusive.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Semi-Exclusive</p>
                          <p className="font-bold text-primary">${semiExclusive.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">24hr Exclusive</p>
                          <p className="font-bold text-primary">${exclusive.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Estimated Totals Per Lead Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Non-Exclusive Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totals.nonExclusiveTotal.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Semi-Exclusive Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totals.semiExclusiveTotal.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">24hr Exclusive Total</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totals.exclusiveTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                These are base prices per keyword. Actual costs depend on lead exclusivity type selected.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/pricing')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Modify Selection
            </Button>
            <Button
              onClick={() => navigate('/digger-registration')}
              size="lg"
            >
              Continue to Create Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
