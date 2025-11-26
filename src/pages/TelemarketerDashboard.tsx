import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TelemarketerLeadUpload } from "@/components/TelemarketerLeadUpload";
import { TelemarketerCommissions } from "@/components/TelemarketerCommissions";
import { TelemarketerLeadsStatus } from "@/components/TelemarketerLeadsStatus";
import { Loader2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";

export default function TelemarketerDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [telemarketerProfile, setTelemarketerProfile] = useState<any>(null);

  useEffect(() => {
    loadTelemarketerProfile();
  }, []);

  const loadTelemarketerProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("telemarketer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setTelemarketerProfile(data);
    } catch (error: any) {
      console.error("Error loading telemarketer profile:", error);
      toast({
        title: "Error",
        description: "Failed to load telemarketer profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!telemarketerProfile) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Telemarketer Profile Found</CardTitle>
            <CardDescription>
              You need a telemarketer profile to access this dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Telemarketer Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your leads and track your commissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {telemarketerProfile.total_leads_uploaded || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              ${(telemarketerProfile.pending_commissions || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${(telemarketerProfile.total_commissions_earned || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Leads</TabsTrigger>
          <TabsTrigger value="status">Lead Status</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <TelemarketerLeadUpload telemarketerProfile={telemarketerProfile} />
        </TabsContent>

        <TabsContent value="status">
          <TelemarketerLeadsStatus telemarketerId={telemarketerProfile.id} />
        </TabsContent>

        <TabsContent value="commissions">
          <TelemarketerCommissions telemarketerId={telemarketerProfile.id} />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
