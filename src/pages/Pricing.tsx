import { Top20ExpensiveKeywords } from "@/components/Top20ExpensiveKeywords";
import { IndustryProfessionSelector } from "@/components/IndustryProfessionSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";

export default function Pricing() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Industry-Specific Lead Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fair, transparent pricing based on real market value. Compare our exclusive and non-exclusive 
              lead costs to industry benchmarks—no hidden fees, no surprises.
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
    </>
  );
}
