import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import { SavedSearchAnalytics } from "@/components/SavedSearchAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark } from "lucide-react";

const SavedSearches = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"gigs" | "diggers">("gigs");

  const handleApplyGigSearch = (filters: any) => {
    navigate("/browse-gigs", { state: { filters } });
  };

  const handleApplyDiggerSearch = (filters: any) => {
    navigate("/browse-diggers", { state: { filters } });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Saved Searches</CardTitle>
                <CardDescription>
                  Manage your saved searches and email alerts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "gigs" | "diggers")}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="gigs">Gig Searches</TabsTrigger>
            <TabsTrigger value="diggers">Digger Searches</TabsTrigger>
          </TabsList>

          <TabsContent value="gigs">
            <div className="space-y-6">
              <SavedSearchAnalytics searchType="gigs" />
              <SavedSearchesList
                searchType="gigs"
                onApplySearch={handleApplyGigSearch}
              />
            </div>
          </TabsContent>

          <TabsContent value="diggers">
            <div className="space-y-6">
              <SavedSearchAnalytics searchType="diggers" />
              <SavedSearchesList
                searchType="diggers"
                onApplySearch={handleApplyDiggerSearch}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SavedSearches;
