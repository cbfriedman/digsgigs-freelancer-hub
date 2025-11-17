import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, Tag } from "lucide-react";

interface KeywordAnalytic {
  keyword: string;
  profession: string | null;
  category_name: string | null;
  times_used: number;
  last_used_at: string;
}

export const KeywordAnalyticsDashboard = () => {
  const [topKeywords, setTopKeywords] = useState<KeywordAnalytic[]>([]);
  const [professionKeywords, setProfessionKeywords] = useState<Record<string, KeywordAnalytic[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch top keywords overall
      const { data: topData, error: topError } = await supabase
        .from("keyword_analytics")
        .select("*")
        .order("times_used", { ascending: false })
        .limit(20);

      if (topError) throw topError;
      setTopKeywords(topData || []);

      // Fetch keywords grouped by profession
      const { data: profData, error: profError } = await supabase
        .from("keyword_analytics")
        .select("*")
        .not("profession", "is", null)
        .order("times_used", { ascending: false });

      if (profError) throw profError;

      // Group by profession
      const grouped: Record<string, KeywordAnalytic[]> = {};
      (profData || []).forEach((item) => {
        if (item.profession) {
          if (!grouped[item.profession]) {
            grouped[item.profession] = [];
          }
          grouped[item.profession].push(item);
        }
      });

      setProfessionKeywords(grouped);
    } catch (error) {
      console.error("Error fetching keyword analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Keyword Analytics</h2>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList>
          <TabsTrigger value="overall">Overall Top Keywords</TabsTrigger>
          <TabsTrigger value="by-profession">By Profession</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Most Used Keywords</h3>
              </div>
              
              {topKeywords.length === 0 ? (
                <p className="text-muted-foreground text-sm">No keyword data yet</p>
              ) : (
                <div className="space-y-2">
                  {topKeywords.map((item, index) => (
                    <div
                      key={`${item.keyword}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium">{item.keyword}</span>
                        {item.profession && (
                          <Badge variant="secondary" className="text-xs">
                            {item.profession}
                          </Badge>
                        )}
                        {item.category_name && (
                          <Badge variant="secondary" className="text-xs">
                            {item.category_name}
                          </Badge>
                        )}
                      </div>
                      <Badge className="text-sm">
                        {item.times_used} {item.times_used === 1 ? "use" : "uses"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="by-profession" className="space-y-4">
          {Object.keys(professionKeywords).length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground text-sm">No profession-specific data yet</p>
            </Card>
          ) : (
            Object.entries(professionKeywords).map(([profession, keywords]) => (
              <Card key={profession} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold capitalize">{profession}</h3>
                    <Badge variant="outline">{keywords.length} keywords</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {keywords.slice(0, 10).map((item, index) => (
                      <div
                        key={`${profession}-${item.keyword}-${index}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-accent/20"
                      >
                        <span className="text-sm font-medium">{item.keyword}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.times_used}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
