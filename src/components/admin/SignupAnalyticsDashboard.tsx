import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, TrendingUp, Smartphone, Monitor, Globe, Facebook, Search, Mail, Eye, Target } from "lucide-react";
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
  // Signups
  today: number;
  last7Days: number;
  last30Days: number;
  allTime: number;
  // Landing page views
  todayViews: number;
  last7DaysViews: number;
  last30DaysViews: number;
  allTimeViews: number;
  // Conversion rates
  todayConversionRate: number;
  last7DaysConversionRate: number;
  last30DaysConversionRate: number;
  allTimeConversionRate: number;
  // Breakdowns
  bySource: Record<string, number>;
  bySourceViews: Record<string, number>;
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
    todayViews: 0,
    last7DaysViews: 0,
    last30DaysViews: 0,
    allTimeViews: 0,
    todayConversionRate: 0,
    last7DaysConversionRate: 0,
    last30DaysConversionRate: 0,
    allTimeConversionRate: 0,
    bySource: {},
    bySourceViews: {},
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

      // Fetch ALL campaign conversions (page views, signup page views, and signups)
      // Note: campaign_conversions table may not be in TypeScript types yet, so we use type assertion
      const { data: conversions, error } = await (supabase
        .from("campaign_conversions" as any)
        .select("*")
        .in("conversion_type", [
          "page_view", 
          "signup_page_view", 
          "signup", 
          "digger_registered", 
          "gigger_registered", 
          "signup_started"
        ])
        .order("created_at", { ascending: false })) as { data: SignupData[] | null; error: any };

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
            todayViews: 0,
            last7DaysViews: 0,
            last30DaysViews: 0,
            allTimeViews: 0,
            todayConversionRate: 0,
            last7DaysConversionRate: 0,
            last30DaysConversionRate: 0,
            allTimeConversionRate: 0,
            bySource: {},
            bySourceViews: {},
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

      // Separate landing page views and signups
      const allEvents = conversions || [];
      
      // Landing page views (from /apply-digger)
      const landingPageViews = allEvents.filter(c => 
        c.conversion_type === "page_view" && c.landing_page === "/apply-digger"
      );
      
      // Signup page views (from /register)
      const signupPageViews = allEvents.filter(c => 
        c.conversion_type === "signup_page_view"
      );
      
      // Actual signups
      const signupConversions = allEvents.filter(c => 
        ["signup", "digger_registered", "gigger_registered"].includes(c.conversion_type)
      );

      // Calculate signup stats
      const today = signupConversions.filter(c => c.created_at >= todayStart).length;
      const last7Days = signupConversions.filter(c => c.created_at >= last7DaysStart).length;
      const last30Days = signupConversions.filter(c => c.created_at >= last30DaysStart).length;
      const allTime = signupConversions.length;

      // Calculate landing page view stats
      const todayViews = landingPageViews.filter(c => c.created_at >= todayStart).length;
      const last7DaysViews = landingPageViews.filter(c => c.created_at >= last7DaysStart).length;
      const last30DaysViews = landingPageViews.filter(c => c.created_at >= last30DaysStart).length;
      const allTimeViews = landingPageViews.length;

      // Calculate conversion rates (signups / landing page views)
      const todayConversionRate = todayViews > 0 ? (today / todayViews) * 100 : 0;
      const last7DaysConversionRate = last7DaysViews > 0 ? (last7Days / last7DaysViews) * 100 : 0;
      const last30DaysConversionRate = last30DaysViews > 0 ? (last30Days / last30DaysViews) * 100 : 0;
      const allTimeConversionRate = allTimeViews > 0 ? (allTime / allTimeViews) * 100 : 0;

      // Group by source (for signups)
      const bySource: Record<string, number> = {};
      signupConversions.forEach(c => {
        const source = c.utm_source || "Direct";
        bySource[source] = (bySource[source] || 0) + 1;
      });

      // Group by source (for views)
      const bySourceViews: Record<string, number> = {};
      landingPageViews.forEach(c => {
        const source = c.utm_source || "Direct";
        bySourceViews[source] = (bySourceViews[source] || 0) + 1;
      });

      // Group by role (conversion_type)
      const byRole: Record<string, number> = {};
      signupConversions.forEach(c => {
        const role = c.conversion_type === "digger_registered" ? "Digger" 
                   : c.conversion_type === "gigger_registered" ? "Gigger" 
                   : "Unknown";
        byRole[role] = (byRole[role] || 0) + 1;
      });

      // Group by device (for signups)
      const byDevice: Record<string, number> = {};
      signupConversions.forEach(c => {
        const device = c.device_type || "Unknown";
        byDevice[device] = (byDevice[device] || 0) + 1;
      });

      // Group by landing page
      const byLandingPage: Record<string, number> = {};
      allEvents.forEach(c => {
        const page = c.landing_page || "Unknown";
        byLandingPage[page] = (byLandingPage[page] || 0) + 1;
      });

      setStats({
        today,
        last7Days,
        last30Days,
        allTime,
        todayViews,
        last7DaysViews,
        last30DaysViews,
        allTimeViews,
        todayConversionRate,
        last7DaysConversionRate,
        last30DaysConversionRate,
        allTimeConversionRate,
        bySource,
        bySourceViews,
        byRole,
        byDevice,
        byLandingPage,
      });

      // Set recent events (last 50) - show all funnel events
      const allRelevantEvents = allEvents.filter(c => 
        ["page_view", "signup_page_view", "signup", "digger_registered", "gigger_registered"].includes(c.conversion_type)
      );
      setRecentSignups(allRelevantEvents.slice(0, 50));

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

      {/* Funnel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.todayViews}</span>
                <span className="text-xs text-muted-foreground">views</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{stats.today}</span>
                <span className="text-xs text-muted-foreground">signups</span>
              </div>
              {stats.todayViews > 0 && (
                <p className="text-xs text-primary font-medium">
                  {stats.todayConversionRate.toFixed(1)}% conversion
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.last7DaysViews}</span>
                <span className="text-xs text-muted-foreground">views</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{stats.last7Days}</span>
                <span className="text-xs text-muted-foreground">signups</span>
              </div>
              {stats.last7DaysViews > 0 && (
                <p className="text-xs text-primary font-medium">
                  {stats.last7DaysConversionRate.toFixed(1)}% conversion
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.last30DaysViews}</span>
                <span className="text-xs text-muted-foreground">views</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{stats.last30Days}</span>
                <span className="text-xs text-muted-foreground">signups</span>
              </div>
              {stats.last30DaysViews > 0 && (
                <p className="text-xs text-primary font-medium">
                  {stats.last30DaysConversionRate.toFixed(1)}% conversion
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats.allTimeViews}</span>
                <span className="text-xs text-muted-foreground">views</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{stats.allTime}</span>
                <span className="text-xs text-muted-foreground">signups</span>
              </div>
              {stats.allTimeViews > 0 && (
                <p className="text-xs text-primary font-medium">
                  {stats.allTimeConversionRate.toFixed(1)}% conversion
                </p>
              )}
            </div>
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
              By Source (Signups)
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
                  .map(([source, count]) => {
                    const views = stats.bySourceViews[source] || 0;
                    const conversionRate = views > 0 ? ((count / views) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(source)}
                            <span className="text-sm capitalize">{source}</span>
                          </div>
                          <Badge variant={getSourceBadgeVariant(source)}>{count}</Badge>
                        </div>
                        {views > 0 && (
                          <div className="text-xs text-muted-foreground pl-6">
                            {views} views • {conversionRate}% conversion
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Funnel Events</CardTitle>
          <CardDescription>Latest tracked events (landing page views, signup page views, and signups) with attribution data</CardDescription>
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
                        <Badge variant={
                          signup.conversion_type === "digger_registered" ? "default" 
                          : signup.conversion_type === "gigger_registered" ? "secondary"
                          : signup.conversion_type === "page_view" ? "outline"
                          : signup.conversion_type === "signup_page_view" ? "outline"
                          : "secondary"
                        }>
                          {signup.conversion_type === "digger_registered" ? "Digger Signup" 
                           : signup.conversion_type === "gigger_registered" ? "Gigger Signup" 
                           : signup.conversion_type === "page_view" ? "Landing View"
                           : signup.conversion_type === "signup_page_view" ? "Signup Page"
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
              <h3 className="font-semibold">About Campaign Funnel Tracking</h3>
              <p className="text-sm text-muted-foreground">
                This dashboard shows the complete funnel from your ad campaigns: landing page views, signup page views, and actual signups.
                All events are tracked with UTM parameters, capturing source, campaign, device, and landing page data.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Conversion Rate:</strong> Calculated as (Signups ÷ Landing Page Views) × 100. This helps you understand how effective your ads are at converting visitors.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Make sure your Facebook and Google ads include UTM parameters (utm_source, utm_medium, utm_campaign) to see attribution data here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
