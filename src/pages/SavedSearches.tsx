import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import { SavedSearchAnalytics } from "@/components/SavedSearchAnalytics";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";

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
    <PageLayout maxWidth="default">
      <SEOHead
        title="Saved searches"
        description="Manage saved gig and digger searches. Get email alerts when new results match."
      />
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Saved searches</h1>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
            Apply saved filters. Get email when new results match.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "gigs" | "diggers")}>
          <TabsList className="grid w-full max-w-sm grid-cols-2 h-9 mb-4 text-sm">
            <TabsTrigger value="gigs">Gigs</TabsTrigger>
            <TabsTrigger value="diggers">Diggers</TabsTrigger>
          </TabsList>

          <TabsContent value="gigs" className="space-y-4 mt-0">
            <SavedSearchAnalytics searchType="gigs" />
            <SavedSearchesList
              searchType="gigs"
              onApplySearch={handleApplyGigSearch}
            />
          </TabsContent>

          <TabsContent value="diggers" className="space-y-4 mt-0">
            <SavedSearchAnalytics searchType="diggers" />
            <SavedSearchesList
              searchType="diggers"
              onApplySearch={handleApplyDiggerSearch}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SavedSearches;
