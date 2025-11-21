import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GOOGLE_CPC_KEYWORDS, calculateExclusiveLeadPrice, calculateNonExclusiveLeadPrice } from "@/config/googleCpcKeywords";
import { TrendingUp, DollarSign, Target, Briefcase } from "lucide-react";

export const Top20ExpensiveKeywords = () => {
  // Calculate overall statistics
  const highestCpc = Math.max(...GOOGLE_CPC_KEYWORDS.flatMap(ind => ind.keywords.map(kw => kw.cpc)));
  const totalIndustries = GOOGLE_CPC_KEYWORDS.length;
  const totalKeywords = GOOGLE_CPC_KEYWORDS.reduce((sum, ind) => sum + ind.keywords.length, 0);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <CardTitle>Top 20 Keywords by Industry</CardTitle>
        </div>
        <CardDescription>
          Premium Google Ads keywords across {totalIndustries} industries ({totalKeywords} total keywords)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Industries</span>
              </div>
              <div className="text-2xl font-bold">{totalIndustries}</div>
              <div className="text-xs text-muted-foreground mt-1">
                High-value sectors
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Highest CPC</span>
              </div>
              <div className="text-2xl font-bold">${highestCpc}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Mesothelioma lawyer
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Exclusive Lead</span>
              </div>
              <div className="text-2xl font-bold">
                ${calculateExclusiveLeadPrice(highestCpc).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                90% of Google CPC
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Non-Exclusive</span>
              </div>
              <div className="text-2xl font-bold">
                ${calculateNonExclusiveLeadPrice(highestCpc).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                20% of Google CPC
              </div>
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

          {/* Industries Accordion */}
          <Accordion type="multiple" className="w-full">
            {GOOGLE_CPC_KEYWORDS.map((industry, index) => {
              const avgCpc = Math.round(industry.keywords.reduce((sum, kw) => sum + kw.cpc, 0) / industry.keywords.length);
              const highestKeyword = industry.keywords[0];
              
              return (
                <AccordionItem key={index} value={`industry-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant={industry.category === 'high-value' ? 'default' : 'secondary'}>
                          {industry.category}
                        </Badge>
                        <span className="font-semibold text-left">{industry.industry}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Avg CPC: ${avgCpc}</span>
                        <span className="text-muted-foreground">Top: ${highestKeyword.cpc}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-lg overflow-hidden mt-2">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Keyword
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
                              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Competition
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {industry.keywords.map((keyword, kwIndex) => {
                              const exclusivePrice = calculateExclusiveLeadPrice(keyword.cpc);
                              const nonExclusivePrice = calculateNonExclusiveLeadPrice(keyword.cpc);
                              
                              return (
                                <tr key={kwIndex} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {kwIndex + 1}
                                  </td>
                                  <td className="px-4 py-3 font-medium">
                                    {keyword.keyword}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">
                                    ${keyword.cpc.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                                    ${exclusivePrice.toFixed(0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                                    ${nonExclusivePrice.toFixed(0)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                                    {keyword.searchVolume.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge 
                                      variant={
                                        keyword.competitionLevel === 'high' ? 'destructive' :
                                        keyword.competitionLevel === 'medium' ? 'default' : 
                                        'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {keyword.competitionLevel}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};
