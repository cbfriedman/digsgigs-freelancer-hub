import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, TrendingUp, Smartphone, Monitor, Globe, Facebook, Search, Mail, Eye, Target, ChevronLeft, ChevronRight, ShieldOff, Trash2, Image } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SignupData {
  id: string;
  conversion_type: string;
  email: string | null;
  user_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  ip_address: string | null;
  country_code: string | null;
  country_name: string | null;
  created_at: string;
}

/** Convert ISO 3166-1 alpha-2 (e.g. US) to flag emoji */
function countryCodeToFlag(cc: string): string {
  if (!cc || cc.length !== 2) return "";
  return [...cc.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

/** Human-friendly label for UTM source (Facebook, Instagram, Google, etc.) */
function sourceDisplayName(source: string | null): string {
  if (!source) return "Direct";
  const s = source.toLowerCase();
  if (s === "facebook" || s === "fb" || s === "meta") return "Facebook";
  if (s === "instagram" || s === "ig") return "Instagram";
  if (s === "google" || s === "google / cpc") return "Google";
  if (s === "email" || s === "newsletter") return "Email";
  if (s === "twitter" || s === "x") return "X (Twitter)";
  if (s === "linkedin") return "LinkedIn";
  if (s === "referral" || s === "referrer") return "Referral";
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
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
  const [blockedIps, setBlockedIps] = useState<{ id: string; ip_address: string }[]>([]);
  const [blockIpValue, setBlockIpValue] = useState("");
  const [blockIpLoading, setBlockIpLoading] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [deleteEventsLoading, setDeleteEventsLoading] = useState(false);
  const [backfillCountryLoading, setBackfillCountryLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const last7DaysStart = startOfDay(subDays(now, 7)).toISOString();
      const last30DaysStart = startOfDay(subDays(now, 30)).toISOString();

      // Fetch campaign conversions and blocked IPs in parallel
      const [
        { data: conversions, error },
        { data: blockedList, error: blockedError },
      ] = await Promise.all([
        (supabase
          .from("campaign_conversions" as any)
          .select("*")
          .in("conversion_type", [
            "page_view",
            "signup_page_view",
            "signup",
            "digger_registered",
            "gigger_registered",
            "signup_started",
          ])
          .order("created_at", { ascending: false })) as unknown as Promise<{ data: SignupData[] | null; error: any }>,
        supabase.from("admin_blocked_ips" as any).select("id, ip_address").order("ip_address"),
      ]) as [{ data: SignupData[] | null; error: any }, { data: { id: string; ip_address: string }[] | null; error: any }];

      if (!blockedError && blockedList) setBlockedIps(blockedList);

      // If query returns empty but we know data exists, check RLS
      if (!error && (!conversions || conversions.length === 0)) {
        console.warn("⚠️ Query returned 0 records. Possible RLS issue. Checking admin access...");
        // Try a simple count query to see if RLS is blocking
        const { count, error: countError } = await (supabase
          .from("campaign_conversions" as any)
          .select("*", { count: 'exact', head: true })) as { count: number | null; error: any };
        console.log("🔍 Count query result:", { count, countError: countError?.message });
      }

      // Debug logging
      console.log("📊 Analytics Query Results:", {
        totalRecords: conversions?.length || 0,
        error: error?.message,
        sampleRecords: conversions?.slice(0, 3),
      });

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
      
      // Debug: Log what we're filtering
      console.log("🔍 Filtering Events:", {
        totalEvents: allEvents.length,
        pageViews: allEvents.filter(c => c.conversion_type === "page_view").length,
        signupPageViews: allEvents.filter(c => c.conversion_type === "signup_page_view").length,
        signups: allEvents.filter(c => ["signup", "digger_registered", "gigger_registered"].includes(c.conversion_type)).length,
      });
      
      // Landing page views (from /apply-digger)
      // Note: Also include page_view events that might not have landing_page set
      const landingPageViews = allEvents.filter(c => 
        c.conversion_type === "page_view" && 
        (c.landing_page === "/apply-digger" || c.landing_page === "apply-digger" || !c.landing_page)
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

      // Set all relevant events - show all funnel events (we'll paginate in the render)
      const allRelevantEvents = allEvents.filter(c => 
        ["page_view", "signup_page_view", "signup", "digger_registered", "gigger_registered"].includes(c.conversion_type)
      );
      setRecentSignups(allRelevantEvents);

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

  const addBlockedIp = async () => {
    const ip = blockIpValue.trim().replace(/\s/g, "");
    if (!ip) {
      toast.error("Enter an IP address");
      return;
    }
    setBlockIpLoading(true);
    try {
      const { error } = await supabase.from("admin_blocked_ips" as any).insert({ ip_address: ip });
      if (error) throw error;
      toast.success(`Blocked IP ${ip}. No new events from this IP will be stored.`);
      setBlockIpValue("");
      loadAnalytics();
    } catch (e: any) {
      if (e?.code === "23505") toast.error("This IP is already blocked");
      else toast.error(e?.message || "Failed to block IP");
    } finally {
      setBlockIpLoading(false);
    }
  };

  const removeBlockedIp = async (id: string) => {
    try {
      const { error } = await supabase.from("admin_blocked_ips" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("IP unblocked");
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.message || "Failed to unblock");
    }
  };

  const deleteSelectedEvents = async () => {
    const ids = Array.from(selectedEventIds);
    if (ids.length === 0) {
      toast.error("Select at least one event");
      return;
    }
    setDeleteEventsLoading(true);
    try {
      const { error } = await supabase.from("campaign_conversions" as any).delete().in("id", ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} event(s)`);
      setSelectedEventIds(new Set());
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete events");
    } finally {
      setDeleteEventsLoading(false);
    }
  };

  const deleteAllEvents = async () => {
    if (!window.confirm("Delete ALL funnel events? This cannot be undone.")) return;
    setDeleteEventsLoading(true);
    try {
      const { error } = await supabase.from("campaign_conversions" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All events deleted");
      setSelectedEventIds(new Set());
      loadAnalytics();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete events");
    } finally {
      setDeleteEventsLoading(false);
    }
  };

  const toggleEventSelection = (id: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEvents = (checked: boolean) => {
    if (checked) setSelectedEventIds(new Set(recentSignups.map((e) => e.id)));
    else setSelectedEventIds(new Set());
  };

  const handleBackfillCountry = async () => {
    setBackfillCountryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-campaign-country");
      if (error) throw error;
      const updated = (data as { updated?: number })?.updated ?? 0;
      toast.success(updated > 0 ? `Updated country for ${updated} event(s).` : "No events needed updating.");
      await loadAnalytics();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to look up country");
    } finally {
      setBackfillCountryLoading(false);
    }
  };

  const handleTestTracking = async () => {
    try {
      toast.loading("Testing tracking system...", { id: "test-tracking" });
      
      const testData = {
        conversion_type: 'page_view',
        landing_page: '/apply-digger',
        utm_source: 'test',
        utm_medium: 'diagnostic',
        utm_campaign: 'system_test',
        utm_content: 'admin_dashboard_test',
        device_type: 'desktop',
        browser: 'chrome',
      };

      const { data, error } = await supabase.functions.invoke('log-campaign-event', {
        body: testData,
      });

      console.log("🔍 Test Tracking - Edge Function Response:", { data, error });

      if (error) {
        toast.error(`Test failed: ${error.message}`, { id: "test-tracking" });
        console.error('Test tracking error:', error);
        
        // Provide specific guidance based on error
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          toast.error("Edge Function 'log-campaign-event' not deployed. Please deploy it from supabase/functions/log-campaign-event/", { duration: 8000 });
        } else if (error.message?.includes('PGRST205') || error.message?.includes('table')) {
          toast.error("campaign_conversions table not found. Please apply the database migration.", { duration: 8000 });
        }
        return;
      }

      // Check if the response indicates success or warning
      if (data?.warning || data?.skipped) {
        toast.warning(`⚠️ ${data.warning || 'Event may not have been logged'}. Check console for details.`, { id: "test-tracking", duration: 8000 });
        console.warn("Edge Function returned warning:", data);
      } else if (data?.success && data?.id) {
        toast.success('✅ Test event logged successfully! ID: ' + data.id, { id: "test-tracking" });
      } else {
        toast.warning('⚠️ Edge Function responded but may not have inserted data. Check console.', { id: "test-tracking", duration: 8000 });
        console.warn("Edge Function response unclear:", data);
      }
      
      // Wait a moment for the database to update, then refresh
      setTimeout(() => {
        handleRefresh();
      }, 1500);
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`, { id: "test-tracking" });
      console.error('Test tracking error:', error);
    }
  };

  const handleDiagnoseData = async () => {
    try {
      toast.loading("Diagnosing data issue...", { id: "diagnose" });
      
      // Check 1: Can we query the table at all?
      const { data: allData, error: queryError } = await (supabase
        .from("campaign_conversions" as any)
        .select("*")
        .limit(10)) as { data: any[] | null; error: any };

      console.log("🔍 Diagnostic Check 1 - Raw Query:", {
        recordCount: allData?.length || 0,
        error: queryError?.message,
        sampleRecord: allData?.[0],
      });

      // Check 2: Query with conversion_type filter
      const { data: filteredData, error: filterError } = await (supabase
        .from("campaign_conversions" as any)
        .select("*")
        .in("conversion_type", ["page_view", "signup_page_view", "digger_registered", "gigger_registered"])
        .limit(10)) as { data: any[] | null; error: any };

      console.log("🔍 Diagnostic Check 2 - Filtered Query:", {
        recordCount: filteredData?.length || 0,
        error: filterError?.message,
        conversionTypes: filteredData?.map(d => d.conversion_type),
      });

      // Check 3: Count total records
      const { count, error: countError } = await (supabase
        .from("campaign_conversions" as any)
        .select("*", { count: 'exact', head: true })) as { count: number | null; error: any };

      console.log("🔍 Diagnostic Check 3 - Total Count:", {
        totalRecords: count,
        error: countError?.message,
      });

      // Check 4: Try direct insert to verify table works
      console.log("🔍 Diagnostic Check 4 - Testing Direct Insert...");
      const { data: insertData, error: insertError } = await (supabase
        .from("campaign_conversions" as any)
        .insert({
          conversion_type: 'page_view',
          landing_page: '/apply-digger',
          utm_source: 'diagnostic_direct_insert',
          utm_medium: 'test',
          utm_campaign: 'diagnostic_test',
        })
        .select()) as { data: any[] | null; error: any };

      console.log("🔍 Diagnostic Check 4 - Direct Insert Result:", {
        success: !insertError,
        insertedRecord: insertData?.[0],
        error: insertError?.message,
        errorCode: insertError?.code,
      });

      // Show results
      if (queryError) {
        toast.error(`Query Error: ${queryError.message}`, { id: "diagnose", duration: 10000 });
      } else if (insertError) {
        toast.error(`Insert Error: ${insertError.message} (Code: ${insertError.code})`, { id: "diagnose", duration: 10000 });
        console.error("Insert error details:", insertError);
      } else if (count === 0 && !insertError) {
        toast.warning(`No records found. Direct insert test ${insertData ? 'succeeded' : 'failed'}. Check console.`, { id: "diagnose", duration: 8000 });
      } else {
        toast.success(`Found ${count} total records. Direct insert test passed.`, { id: "diagnose", duration: 5000 });
      }

      // Refresh dashboard after diagnosis
      setTimeout(() => {
        handleRefresh();
      }, 1000);

    } catch (error: any) {
      toast.error(`Diagnosis failed: ${error.message}`, { id: "diagnose" });
      console.error('Diagnosis error:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s === "facebook" || s === "meta" || s === "fb") return <Facebook className="h-4 w-4" />;
    if (s === "instagram" || s === "ig") return <Image className="h-4 w-4" />;
    if (s === "google" || s === "google / cpc") return <Search className="h-4 w-4" />;
    if (s === "email" || s === "newsletter") return <Mail className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getSourceBadgeVariant = (source: string): "default" | "secondary" | "outline" | "destructive" => {
    const s = source.toLowerCase();
    if (s === "facebook" || s === "meta" || s === "fb") return "default";
    if (s === "instagram" || s === "ig") return "secondary";
    if (s === "google" || s === "google / cpc") return "secondary";
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
          <p className="text-muted-foreground">
            See where each user came from when they signed up: Facebook, Instagram, Google, referral, email, or direct. Use the table and &quot;By Source&quot; card below.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestTracking} variant="secondary" size="sm">
            Test Tracking
          </Button>
          <Button onClick={handleDiagnoseData} variant="secondary" size="sm">
            Diagnose Data
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
                            <span className="text-sm">{sourceDisplayName(source)}</span>
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

      {/* Block IP address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Block IP address
          </CardTitle>
          <CardDescription>
            No events from blocked IPs will be stored. Add an IP (e.g. 155.254.40.92) to stop receiving any tracking from that address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="e.g. 155.254.40.92"
              value={blockIpValue}
              onChange={(e) => setBlockIpValue(e.target.value)}
              className="max-w-[220px] font-mono"
            />
            <Button onClick={addBlockedIp} disabled={blockIpLoading}>
              {blockIpLoading ? "Adding…" : "Block IP"}
            </Button>
          </div>
          {blockedIps.length > 0 && (
            <div className="rounded border p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Blocked IPs</p>
              <ul className="flex flex-wrap gap-2">
                {blockedIps.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 rounded bg-muted px-2 py-1 font-mono text-sm">
                    <span>{b.ip_address}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive hover:text-destructive" onClick={() => removeBlockedIp(b.id)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Funnel Events</CardTitle>
          <CardDescription>
            Latest tracked events (landing page views, signup page views, and signups) with attribution data.
            {recentSignups.some((e) => e.ip_address && !e.country_code) && (
              <span className="block mt-2">
                Country column empty for some rows?{" "}
                <Button variant="link" className="p-0 h-auto font-medium" onClick={handleBackfillCountry} disabled={backfillCountryLoading}>
                  {backfillCountryLoading ? "Looking up…" : "Look up country from IP"}
                </Button>
                {" "}(up to 40 per run).
              </span>
            )}
          </CardDescription>
          {recentSignups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Checkbox
                checked={selectedEventIds.size === recentSignups.length && recentSignups.length > 0}
                onCheckedChange={(c) => selectAllEvents(!!c)}
              />
              <span className="text-sm text-muted-foreground">Select all</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedEventIds(new Set())}>
                Deselect all
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedEventIds.size === 0 || deleteEventsLoading}
                onClick={deleteSelectedEvents}
              >
                {deleteEventsLoading ? "Deleting…" : `Delete selected (${selectedEventIds.size})`}
              </Button>
              <Button variant="destructive" size="sm" disabled={deleteEventsLoading} onClick={deleteAllEvents}>
                Delete all events
              </Button>
            </div>
          )}
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
              <p className="text-xs mt-2 text-muted-foreground mb-4">
                Once tracking is enabled, signups will appear here with attribution data from your campaigns.
              </p>
              <div className="flex flex-col gap-2 items-center">
                <p className="text-xs font-medium mb-2">Quick Diagnostics:</p>
                <Button 
                  onClick={handleTestTracking} 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  Test Tracking System
                </Button>
                <p className="text-xs text-muted-foreground mt-2 max-w-md text-center">
                  Click "Test Tracking System" to verify the Edge Function and database are working. 
                  If successful, a test event will appear in the table above.
                </p>
              </div>
            </div>
          ) : recentSignups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No signup events tracked yet</p>
              <p className="text-sm mt-2">Signups will appear here once users register through your campaigns</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto w-full">
              <div className="min-w-max">
                <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Landing Page</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Calculate pagination
                    const totalItems = recentSignups.length;
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedData = recentSignups.slice(startIndex, endIndex);
                    
                    return paginatedData.map((signup, index) => (
                      <TableRow key={signup.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEventIds.has(signup.id)}
                            onCheckedChange={() => toggleEventSelection(signup.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {startIndex + index + 1}
                        </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(signup.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs" title={signup.id}>
                        <span className="text-muted-foreground">{signup.id.substring(0, 8)}...</span>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {signup.email ? (
                          <span className="text-sm font-medium truncate block" title={signup.email}>
                            {signup.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-xs" title={signup.user_id || "No user ID"}>
                        {signup.user_id ? (
                          <span className="text-muted-foreground">{signup.user_id.substring(0, 8)}...</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                          <span className="text-sm">{sourceDisplayName(signup.utm_source)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-sm" title={signup.utm_medium || ""}>
                        {signup.utm_medium || "—"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm" title={signup.utm_campaign || ""}>
                        {signup.utm_campaign || "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-sm" title={signup.utm_content || ""}>
                        {signup.utm_content || "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-sm" title={signup.utm_term || ""}>
                        {signup.utm_term || "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-sm" title={signup.landing_page || ""}>
                        {signup.landing_page?.replace(/^\//, "") || "—"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs" title={signup.referrer || "No referrer"}>
                        {signup.referrer ? (
                          <span className="text-muted-foreground truncate block">{signup.referrer}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {signup.device_type === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                          <span className="capitalize text-sm">{signup.device_type || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-sm capitalize" title={signup.browser || "No browser"}>
                        {signup.browser || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap" title={signup.ip_address || "No IP"}>
                        {signup.ip_address ? (
                          <span className="text-muted-foreground">{signup.ip_address}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {(signup.country_code || signup.country_name) ? (
                          <span title={signup.country_name || signup.country_code || ""}>
                            {signup.country_code ? countryCodeToFlag(signup.country_code) : ""}
                            {signup.country_code && signup.country_name ? " " : ""}
                            <span className="text-sm">{signup.country_name || signup.country_code || ""}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
              </div>
              
              {/* Pagination Controls */}
              {(() => {
                const totalItems = recentSignups.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
                
                if (totalPages <= 1) return null;
                
                // Calculate page numbers to show
                const getPageNumbers = () => {
                  const pages: (number | string)[] = [];
                  const maxVisible = 7;
                  
                  if (totalPages <= maxVisible) {
                    // Show all pages if total is less than max
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Always show first page
                    pages.push(1);
                    
                    if (currentPage > 3) {
                      pages.push('ellipsis-start');
                    }
                    
                    // Show pages around current page
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    
                    if (currentPage < totalPages - 2) {
                      pages.push('ellipsis-end');
                    }
                    
                    // Always show last page
                    pages.push(totalPages);
                  }
                  
                  return pages;
                };
                
                return (
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                        <span className="font-medium">{endIndex}</span> of{" "}
                        <span className="font-medium">{totalItems}</span> events
                      </p>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1); // Reset to first page when changing items per page
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                    
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                              }
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers().map((page, idx) => {
                          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                            return (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          
                          const pageNum = page as number;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                              }
                            }}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                );
              })()}
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
              <h3 className="font-semibold">Where did users come from?</h3>
              <p className="text-sm text-muted-foreground">
                Use the <strong>Source</strong> column in the table above and the <strong>By Source (Signups)</strong> card to see each signup’s origin: Facebook, Instagram, Google, email, referral, or Direct. The <strong>Referrer</strong> column shows the previous site URL when available.
              </p>
              <p className="text-sm text-muted-foreground">
                Add UTM parameters to your links so we can attribute signups: <code className="text-xs bg-muted px-1 rounded">?utm_source=facebook&amp;utm_medium=social</code> or <code className="text-xs bg-muted px-1 rounded">?utm_source=instagram</code>, <code className="text-xs bg-muted px-1 rounded">?utm_source=google</code>, etc.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Conversion Rate:</strong> (Signups ÷ Landing Page Views) × 100. <strong>Tip:</strong> Use the same utm_source in your Facebook, Instagram, and Google ad URLs to see which channel drives the most signups.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
