import { Top20ExpensiveKeywords } from "@/components/Top20ExpensiveKeywords";
import { IndustryProfessionSelector } from "@/components/IndustryProfessionSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Google CPC-Based Pricing Research
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We've analyzed the top 20 most expensive Google Ads keywords across all industries. 
              Our exclusive leads are priced at just <span className="font-semibold text-foreground">1.2x the average CPC</span>—
              offering transparent, value-based pricing that beats competitors who charge arbitrary fees.
            </p>
          </div>
          
          <Tabs defaultValue="selector" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="selector">Find Your Specialty</TabsTrigger>
              <TabsTrigger value="full-data">View All Keywords</TabsTrigger>
            </TabsList>
            <TabsContent value="selector" className="mt-8">
              <IndustryProfessionSelector />
            </TabsContent>
            <TabsContent value="full-data" className="mt-8">
              <Top20ExpensiveKeywords />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
