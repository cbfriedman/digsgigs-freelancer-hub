import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Users, Gift } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EligibleDigger {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  full_name: string | null;
  giveaway_qualified_at: string | null;
  profile_image_url: string | null;
}

export const GiveawayReportTab = () => {
  const [loading, setLoading] = useState(true);
  const [eligibleDiggers, setEligibleDiggers] = useState<EligibleDigger[]>([]);
  const [totalEligible, setTotalEligible] = useState(0);

  useEffect(() => {
    loadEligibleDiggers();
  }, []);

  const loadEligibleDiggers = async () => {
    try {
      setLoading(true);
      
      // Get all eligible digger profiles
      const { data: diggerProfiles, error: diggerError } = await (supabase as any)
        .from("digger_profiles")
        .select(`
          id,
          user_id,
          business_name,
          giveaway_qualified_at,
          profile_image_url
        `)
        .eq("is_giveaway_eligible", true)
        .order("giveaway_qualified_at", { ascending: false });

      if (diggerError) throw diggerError;

      // Get user profiles separately to handle RLS
      const userIds = (diggerProfiles || []).map(p => p.user_id);
      
      const { data: userProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profileError) {
        console.warn("Error loading user profiles (non-fatal):", profileError);
      }

      // Create a map for quick lookup
      const profileMap = new Map(
        (userProfiles || []).map(p => [p.id, p])
      );

      // Transform the data with proper typing
      const transformed: EligibleDigger[] = (diggerProfiles || []).map((profile) => {
        const userProfile = profileMap.get(profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          business_name: profile.business_name || "",
          email: userProfile?.email || "N/A",
          full_name: userProfile?.full_name || null,
          giveaway_qualified_at: profile.giveaway_qualified_at,
          profile_image_url: profile.profile_image_url,
        };
      });

      setEligibleDiggers(transformed);
      setTotalEligible(transformed.length);
    } catch (error: any) {
      console.error("Error loading eligible diggers:", error);
      toast.error("Failed to load eligible diggers", {
        description: error?.message || "Check console for details"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (eligibleDiggers.length === 0) {
      toast.error("No data to export");
      return;
    }

    // CSV headers
    const headers = [
      "Business Name",
      "Full Name",
      "Email",
      "Qualified At",
      "Profile ID",
      "User ID"
    ];

    // CSV rows
    const rows = eligibleDiggers.map(digger => [
      digger.business_name || "",
      digger.full_name || "",
      digger.email,
      digger.giveaway_qualified_at 
        ? format(new Date(digger.giveaway_qualified_at), "yyyy-MM-dd HH:mm:ss")
        : "",
      digger.id,
      digger.user_id
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `giveaway-eligible-diggers-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Giveaway Eligibility Report
          </CardTitle>
          <CardDescription>
            Track freelancers eligible for the Early-Access Freelancer Grant Giveaway
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalEligible}</div>
                <div className="text-sm text-muted-foreground">Total Eligible</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {totalEligible >= 500 ? "500+" : `${500 - totalEligible}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalEligible >= 500 ? "Goal Reached!" : "Until Goal"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadEligibleDiggers}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={eligibleDiggers.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </div>

          {/* Eligibility Criteria Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Eligibility Criteria</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Email verified</li>
              <li>Profile fields completed (business name, phone, location, bio)</li>
              <li>Categories/professions selected</li>
              <li>Profile photo uploaded</li>
              <li>Admin approval completed (verified = true)</li>
            </ul>
          </div>

          {/* Eligible Diggers Table */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading eligible diggers...</p>
            </div>
          ) : eligibleDiggers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No eligible diggers yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Diggers will appear here once they meet all eligibility criteria
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Qualified At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleDiggers.map((digger) => (
                    <TableRow key={digger.id}>
                      <TableCell className="font-medium">
                        {digger.business_name}
                      </TableCell>
                      <TableCell>
                        {digger.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        {digger.email}
                      </TableCell>
                      <TableCell>
                        {digger.giveaway_qualified_at
                          ? format(new Date(digger.giveaway_qualified_at), "MMM d, yyyy h:mm a")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">
                          Eligible
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Campaign Details
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Campaign Name:</strong> Digs & Gigs Early-Access Freelancer Grant Giveaway</p>
              <p><strong>Prizes:</strong> 2 winners × $500, 2 winners × $250</p>
              <p><strong>Goal:</strong> 500 eligible profiles or 30 days — whichever comes first</p>
              <p><strong>Selection:</strong> Random selection after goal is reached</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
