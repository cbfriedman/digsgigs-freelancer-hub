import { Top20ExpensiveKeywords } from "@/components/Top20ExpensiveKeywords";

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
              We've analyzed the top 20 most expensive Google Ads keywords across all industries 
              to create transparent, value-based pricing for exclusive leads.
            </p>
          </div>
          
          <Top20ExpensiveKeywords />
        </div>
      </div>
    </div>
  );
}
