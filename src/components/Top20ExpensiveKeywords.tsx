import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TOP_20_MOST_EXPENSIVE_KEYWORDS, calculateExclusiveLeadPrice, calculateNonExclusiveLeadPrice } from "@/config/googleCpcKeywords";
import { TrendingUp, DollarSign, Target } from "lucide-react";

export const Top20ExpensiveKeywords = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <CardTitle>Top 20 Most Expensive Google Ads Keywords</CardTitle>
        </div>
        <CardDescription>
          The highest-cost keywords across all industries (2025 data)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Highest CPC</span>
              </div>
              <div className="text-2xl font-bold">${TOP_20_MOST_EXPENSIVE_KEYWORDS[0].cpc}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {TOP_20_MOST_EXPENSIVE_KEYWORDS[0].keyword}
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Our Exclusive Price</span>
              </div>
              <div className="text-2xl font-bold">
                ${calculateExclusiveLeadPrice(TOP_20_MOST_EXPENSIVE_KEYWORDS[0].cpc).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                90% of Google CPC (10% discount)
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Non-Exclusive Price</span>
              </div>
              <div className="text-2xl font-bold">
                ${calculateNonExclusiveLeadPrice(TOP_20_MOST_EXPENSIVE_KEYWORDS[0].cpc).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                20% of Google CPC
              </div>
            </div>
          </div>

          {/* Keywords Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Keyword
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Google CPC
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Our Exclusive
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Non-Exclusive
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Monthly Searches
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {TOP_20_MOST_EXPENSIVE_KEYWORDS.map((item) => {
                    const exclusivePrice = calculateExclusiveLeadPrice(item.cpc);
                    const nonExclusivePrice = calculateNonExclusiveLeadPrice(item.cpc);
                    
                    return (
                      <tr key={item.rank} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Badge variant={item.rank <= 5 ? "default" : "secondary"}>
                            #{item.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.keyword}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.industry}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ${item.cpc.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                          ${exclusivePrice.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          ${nonExclusivePrice.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {item.searchVolume.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              DigsandGigs Advantage
            </h4>
            <p className="text-sm text-muted-foreground">
              We limit our diggers to the top 20 most expensive keywords in each industry, ensuring 
              they only receive <span className="font-semibold text-foreground">premium, high-value leads</span>. 
              Our pricing is tied directly to Google CPC, offering transparency and exceptional value compared 
              to competitors who charge arbitrary fees regardless of lead quality.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
