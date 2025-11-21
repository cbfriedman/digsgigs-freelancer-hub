import { useEffect } from "react";
import { Top20ExpensiveKeywords } from "@/components/Top20ExpensiveKeywords";
import { IndustryProfessionSelector } from "@/components/IndustryProfessionSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Pricing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect to registration if not logged in
    if (!loading && !user) {
      navigate("/register");
    }
  }, [user, loading, navigate]);

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
            <p className="text-sm text-muted-foreground/70 mt-2">
              Note: Prices fluctuate daily and are subject to change
            </p>
            <Button 
              onClick={() => navigate("/profile-demo")}
              className="mt-4"
              size="lg"
            >
              <Eye className="mr-2 h-5 w-5" />
              Preview My Profile
            </Button>
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
