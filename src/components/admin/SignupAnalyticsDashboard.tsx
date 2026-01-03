import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, TrendingUp, Smartphone, Monitor, Globe, Facebook, Search, Mail } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface SignupData {
  id: string;
  conversion_type: string;
  email: string | null;
  user_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string | null;
  device_type: string | null;
  browser: string | null;
  created_at: string;
}

interface SignupStats {
  today: number;
  last7Days: number;
  last30Days: number;
  allTime: number;
  bySource: Record<string, number>;
  byRole: Record<string, number>;
  byDevice: Record<string, number>;
  byLandingPage: Record<string, number>;
}

export const SignupAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SignupStats>({
    today: 0,
    last7Days: 0,
    last30Days: 0,
    allTime: 0,
    bySource: {},
    byRole: {},
    byDevice: {},
    byLandingPage: {},
  });
  const [recentSignups, setRecentSignups] = useState<SignupData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const last7DaysStart = startOfDay(subDays(now, 7)).toISOString();
      const last30DaysStart = startOfDay(subDays(now, 30)).toISOString();

      // Fetch all signup-related conversions
      const { data: conversions, error } = await supabase
        .from("campaign_conversions")
        .select("*")
        .in("conversion_type", ["signup", "digger_registered", "gigger_registered", "signup_started", "signup_page_view"])
        .order("created_at", { ascending: false });

      // Handle table not found error gracefully
      if (error) {
        // Check if it's a "table not found" error
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('campaign_conversions')) {
          console.warn("campaign_conversions table not found - migration may not have been applied");
          // Set empty stats and show message
          setStats({
            today: 0,
            last7Days: 0,
            last30Days: 0,
            allTime: 0,
            bySource: {},
            byRole: {},
            byDevice: {},
            byLandingPage: {},
          });
          setRecentSignups([]);
          setLoading(false);
          setRefreshing(false);
          // Don't show error toast for missing table - it's expected if migration hasn't run
          return;
        }
        throw error;
      }

      const signupConversions = conversions?.filter(c => 
        ["signup", "digger_registered", "gigger_registered"].includes(c.conversion_type)
      ) || [];

      // Calculate stats
      const today = signupConversions.filter(c => c.created_at >= todayStart).length;
      const last7Days = signupConversions.filter(c => c.created_at >= last7DaysStart).length;
      const last30Days = signupConversions.filter(c => c.created_at >= last30DaysStart).length;
      const allTime = signupConversions.length;

      // Group by source
      const bySource: Record<string, number> = {};
      signupConversions.forEach(c => {
        const source = c.utm_source || "Direct";
        bySource[source] = (bySource[source] || 0) + 1;
      });

      // Group by role (conversion_type)
      const byRole: Record<string, number> = {};
      signupConversions.forEach(c => {
        const role = c.conversion_type === "digger_registered" ? "Digger" 
                   : c.conversion_type === "gigger_registered" ? "Gigger" 
                   : "Unknown";
        byRole[role] = (byRole[role] || 0) + 1;
      });

      // Group by device
      const byDevice: Record<string, number> = {};
      signupConversions.forEach(c => {
        const device = c.device_type || "Unknown";
        byDevice[device] = (byDevice[device] || 0) + 1;
      });

      // Group by landing page
      const byLandingPage: Record<string, number> = {};
      signupConversions.forEach(c => {
        const page = c.landing_page || "Unknown";
        byLandingPage[page] = (byLandingPage[page] || 0) + 1;
      });

      setStats({
        today,
        last7Days,
        last30Days,
        allTime,
        bySource,
        byRole,
        byDevice,
        byLandingPage,
      });

      // Set recent signups (last 20)
      setRecentSignups(signupConversions.slice(0, 20));

    } catch (error) {
      console.error("Error loading signup analytics:", error);
      toast.error("Failed to load signup analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s === "facebook" || s === "meta" || s === "fb") return <Facebook className="h-4 w-4" />;
    if (s === "google") return <Search className="h-4 w-4" />;
    if (s === "email") return <Mail className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getSourceBadgeVariant = (source: string): "default" | "secondary" | "outline" | "destructive" => {
    const s = source.toLowerCase();
    if (s === "facebook" || s === "meta" || s === "fb") return "default";
    if (s === "google") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Signup Analytics</h2>
          <p className="text-muted-foreground">Track signups from your ad campaigns</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">signups today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last7Days}</div>
            <p className="text-xs text-muted-foreground">signups this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last30Days}</div>
            <p className="text-xs text-muted-foreground">signups this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.allTime}</div>
            <p className="text-xs text-muted-foreground">total tracked signups</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* By Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              By Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.bySource).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(source)}
                        <span className="text-sm capitalize">{source}</span>
                      </div>
                      <Badge variant={getSourceBadgeVariant(source)}>{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.byRole).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byRole)
                  .sort((a, b) => b[1] - a[1])
                  .map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm">{role}</span>
                      <Badge variant={role === "Digger" ? "default" : "secondary"}>{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Device */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              By Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.byDevice).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byDevice)
                  .sort((a, b) => b[1] - a[1])
                  .map(([device, count]) => (
                    <div key={device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                        <span className="text-sm capitalize">{device}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Landing Page */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              By Landing Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.byLandingPage).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.byLandingPage)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([page, count]) => (
                    <div key={page} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[120px]" title={page}>
                        {page === "Unknown" ? page : page.replace(/^\//, "")}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Latest tracked signup events with attribution data</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.allTime === 0 && recentSignups.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No signup tracking data available</p>
              <p className="text-sm mt-2">
                The campaign_conversions table may not be set up yet. 
                Please ensure the database migration has been applied.
              </p>
              <p className="text-xs mt-2 text-muted-foreground">
                Once tracking is enabled, signups will appear here with attribution data from your campaigns.
              </p>
            </div>
          ) : recentSignups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No signup events tracked yet</p>
              <p className="text-sm mt-2">Signups will appear here once users register through your campaigns</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Landing Page</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSignups.map((signup) => (
                    <TableRow key={signup.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(signup.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={signup.email || ""}>
                        {signup.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={signup.conversion_type === "digger_registered" ? "default" : "secondary"}>
                          {signup.conversion_type === "digger_registered" ? "Digger" 
                           : signup.conversion_type === "gigger_registered" ? "Gigger" 
                           : signup.conversion_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {signup.utm_source && getSourceIcon(signup.utm_source)}
                          <span className="capitalize">{signup.utm_source || "Direct"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={signup.utm_campaign || ""}>
                        {signup.utm_campaign || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {signup.device_type === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                          <span className="capitalize">{signup.device_type || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate" title={signup.landing_page || ""}>
                        {signup.landing_page?.replace(/^\//, "") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">About Signup Tracking</h3>
              <p className="text-sm text-muted-foreground">
                This dashboard shows signup events tracked through UTM parameters from your ad campaigns.
                Events are logged when users complete registration, capturing source, campaign, device, and landing page data.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Make sure your Facebook and Google ads include UTM parameters to see attribution data here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
