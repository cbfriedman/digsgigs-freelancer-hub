import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, RefreshCw, TrendingUp, Users, Clock, CheckCircle2, Lightbulb, MessageSquare, Settings, Shield, Database, FlaskConical, Megaphone, MailPlus, Crown, Search, ShieldAlert, ClipboardCheck, Inbox, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { KeywordAnalyticsDashboard } from "@/components/KeywordAnalyticsDashboard";
import { CpcDataUploader } from "@/components/CpcDataUploader";
import { MarketingEmailsTab } from "@/components/admin/MarketingEmailsTab";
import { ColdOutreachTab } from "@/components/admin/ColdOutreachTab";
import { FoundingDiggerTab } from "@/components/admin/FoundingDiggerTab";
import { SignupAnalyticsDashboard } from "@/components/admin/SignupAnalyticsDashboard";
import { GiveawayReportTab } from "@/components/admin/GiveawayReportTab";
import { MessageViolationsDashboard } from "@/components/admin/MessageViolationsDashboard";
import SupportInboxTab from "@/components/admin/SupportInboxTab";
import MessageNotificationSettingsTab from "@/components/admin/MessageNotificationSettingsTab";
import ManageGigsTab from "@/components/admin/ManageGigsTab";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Footer } from "@/components/Footer";
interface ReminderStats {
  total: number;
  day3: number;
  day7: number;
  day14: number;
}

interface ReminderRecord {
  id: string;
  reminder_type: string;
  sent_at: string;
  profile_completion_at_send: number;
  digger: {
    business_name: string;
    user_id: string;
  };
  profile: {
    email: string;
    full_name: string;
  };
}

interface KeywordRequest {
  id: string;
  profession: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  user_id: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("signup-analytics");
  const [stats, setStats] = useState<ReminderStats>({ total: 0, day3: 0, day7: 0, day14: 0 });
  const [recentReminders, setRecentReminders] = useState<ReminderRecord[]>([]);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [keywordRequests, setKeywordRequests] = useState<KeywordRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [checkingUpgrades, setCheckingUpgrades] = useState(false);
  const [supportInboxCount, setSupportInboxCount] = useState<number | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      if (!user) {
        toast.error("Please sign in to access this page");
        navigate("/auth");
        return;
      }

      // First check: Use userRoles from AuthContext (already loaded, no query needed)
      if (userRoles.includes('admin')) {
        setIsAdmin(true);
        await loadDashboardData();
        await loadKeywordRequests();
        setLoading(false);
        return;
      }

      // Fallback: Try using the safe RPC function (bypasses RLS)
      let isAdminCheck = false;
      let rolesError = null;

      try {
        const { data: functionData, error: functionError } = await (supabase
          .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
        
        if (!functionError && functionData) {
          // Check if admin role exists in the results
          isAdminCheck = (functionData as any[]).some((r: any) => r.app_role === 'admin');
        } else {
          // Fallback: Try using has_app_role function
          const { data: hasAdmin, error: hasAdminError } = await supabase
            .rpc('has_app_role', { _user_id: user.id, _role: 'admin' });
          
          if (!hasAdminError && hasAdmin) {
            isAdminCheck = hasAdmin === true;
          } else {
            rolesError = hasAdminError || functionError;
          }
        }
      } catch (rpcError) {
        console.warn('RPC functions not available:', rpcError);
        rolesError = rpcError as any;
      }

      if (rolesError) {
        console.error("Error checking admin status:", rolesError);
        // If RLS recursion error, trust AuthContext roles
        if (rolesError.message?.includes('infinite recursion') || rolesError.code === '42P17') {
          console.warn('RLS recursion detected - trusting AuthContext roles');
          // If userRoles includes admin, allow access
          if (userRoles.includes('admin')) {
            setIsAdmin(true);
            await loadDashboardData();
            await loadKeywordRequests();
            setLoading(false);
            return;
          }
        }
      }

      if (!isAdminCheck) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
      await loadKeywordRequests();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get reminder statistics
      const { data: reminders, error: remindersError } = await supabase
        .from("profile_completion_reminders")
        .select("*");

      if (remindersError) throw remindersError;

      const stats: ReminderStats = {
        total: reminders?.length || 0,
        day3: reminders?.filter(r => r.reminder_type === "3_day").length || 0,
        day7: reminders?.filter(r => r.reminder_type === "7_day").length || 0,
        day14: reminders?.filter(r => r.reminder_type === "14_day").length || 0,
      };

      setStats(stats);

      // Get recent reminders with digger info
      const { data: recentData, error: recentError } = await supabase
        .from("profile_completion_reminders")
        .select(`
          id,
          reminder_type,
          sent_at,
          profile_completion_at_send,
          digger_profiles!inner(
            business_name,
            user_id
          )
        `)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      // Fetch profile emails for each reminder
      const remindersWithEmails = await Promise.all(
        (recentData || []).map(async (reminder: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", reminder.digger_profiles.user_id)
            .single();

          return {
            ...reminder,
            digger: reminder.digger_profiles,
            profile: profile || { email: "N/A", full_name: "N/A" },
          };
        })
      );

      setRecentReminders(remindersWithEmails);

      // Support inbox count (for sidebar badge)
      const { count: inboxCount } = await supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true });
      setSupportInboxCount(inboxCount ?? null);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const triggerReminderJob = async () => {
    setTriggeringJob(true);
    try {
      const data = await invokeEdgeFunction<{ remindersSent?: number }>(supabase, "send-profile-reminders", {
        body: { manual_trigger: true },
      });

      toast.success(`Reminder job completed! ${data.remindersSent} reminders sent.`);
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error triggering reminder job:", error);
      toast.error("Failed to trigger reminder job: " + (error?.message ?? "Unknown error"));
    } finally {
      setTriggeringJob(false);
    }
  };

  const loadKeywordRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("keyword_suggestion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setKeywordRequests(data || []);
    } catch (error) {
      console.error("Error loading keyword requests:", error);
      toast.error("Failed to load keyword requests");
    }
  };

  const markAsProcessed = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from("keyword_suggestion_requests")
        .update({ 
          status: "completed",
          processed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request marked as completed");
      await loadKeywordRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const data = await invokeEdgeFunction<{ emailsSent?: number }>(supabase, 'notify-keyword-request', {
        body: {
          profession: 'Test Profession (Software Developer)',
          requestId: 'test-' + Date.now()
        }
      });

      toast.success("Test email sent successfully!", {
        description: data?.emailsSent ? `Sent to ${data.emailsSent} admin(s)` : "Check admin inboxes"
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email", {
        description: error?.message || "Check console for details"
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const checkUpgradeSavings = async () => {
    setCheckingUpgrades(true);
    try {
      const data = await invokeEdgeFunction<{ notificationsSent?: number }>(supabase, 'check-upgrade-savings');

      toast.success("Upgrade savings check completed!", {
        description: data?.notificationsSent
          ? `Sent ${data.notificationsSent} notification(s) to eligible diggers`
          : "No eligible diggers found"
      });
    } catch (error: any) {
      console.error("Error checking upgrade savings:", error);
      toast.error("Failed to check upgrade savings", {
        description: error?.message || "Check console for details"
      });
    } finally {
      setCheckingUpgrades(false);
    }
  };

  const getReminderTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      "3_day": { label: "3 Days", variant: "default" },
      "7_day": { label: "7 Days", variant: "secondary" },
      "14_day": { label: "14 Days", variant: "destructive" },
    };
    
    const config = variants[type] || { label: type, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const menuItems = [
    { id: "signup-analytics", label: "Signup Analytics", icon: TrendingUp },
    { id: "reminders", label: "Profile Reminders", icon: Mail },
    { id: "founding-diggers", label: "Founding Diggers", icon: Crown },
    { id: "marketing", label: "Marketing Emails", icon: Megaphone },
    { id: "cold-outreach", label: "Cold Outreach", icon: MailPlus },
    { id: "message-violations", label: "Message Violations", icon: ShieldAlert },
    { id: "keywords", label: "Keyword Analytics", icon: Search },
    { id: "requests", label: "Keyword Requests", icon: Lightbulb },
    { id: "cpc-data", label: "CPC Data", icon: Database },
    { id: "giveaway", label: "Giveaway Report", icon: Crown },
    { id: "manage-gigs", label: "Manage gigs", icon: Briefcase },
    { id: "test-results", label: "QA Test Results", icon: ClipboardCheck },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col w-full">
        <div className="flex flex-1 w-full">
          <Sidebar variant="inset" collapsible="icon" className="!bg-[hsl(240_5%_94%)] dark:!bg-[hsl(240_10%_15%)] border-r-2 border-sidebar-border shadow-xl">
          <SidebarHeader className="border-b bg-[hsl(240_5%_96%)] dark:bg-[hsl(240_10%_18%)]">
            <div className="flex items-center gap-2 px-2 py-4">
              <Shield className="h-6 w-6 text-primary" />
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <h2 className="text-lg font-semibold">Admin Dashboard</h2>
                <p className="text-xs text-muted-foreground">Management Portal</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Analytics</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.slice(0, 3).map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={activeTab === item.id}
                          tooltip={item.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Marketing</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.slice(3, 5).map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={activeTab === item.id}
                          tooltip={item.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Keywords</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.slice(5, 7).map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={activeTab === item.id}
                          tooltip={item.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Data & Reports</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.slice(7, 11).map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={activeTab === item.id}
                          tooltip={item.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Support</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("support-inbox")}
                      isActive={activeTab === "support-inbox"}
                      tooltip="Contact Inbox"
                    >
                      <Inbox className="h-4 w-4" />
                      <span>Contact Inbox</span>
                      {supportInboxCount != null && supportInboxCount > 0 && (
                        <Badge variant="secondary" className="ml-auto size-5 rounded-full p-0 text-xs">
                          {supportInboxCount > 99 ? "99+" : supportInboxCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("message-notifications")}
                      isActive={activeTab === "message-notifications"}
                      tooltip="Message email settings"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Message email settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Testing</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate("/admin/test-results")}
                      tooltip="QA Test Results"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      <span>QA Test Results</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate("/e2e-test-suite")}
                      tooltip="E2E Tests"
                    >
                      <FlaskConical className="h-4 w-4" />
                      <span>E2E Tests</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col h-full">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-2 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Home</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/users")}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">User Management</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/notifications")}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden lg:inline">Settings</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/admin/lead-distribution-test")}
                  className="gap-2"
                >
                  <FlaskConical className="h-4 w-4" />
                  <span className="hidden lg:inline">Lead Test</span>
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <div className="max-w-7xl mx-auto space-y-6">

                {activeTab === "signup-analytics" && (
                  <SignupAnalyticsDashboard />
                )}

                {activeTab === "support-inbox" && (
                  <SupportInboxTab />
                )}

                {activeTab === "message-notifications" && (
                  <MessageNotificationSettingsTab />
                )}

                {activeTab === "manage-gigs" && (
                  <ManageGigsTab />
                )}

                {activeTab === "reminders" && (
                  <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={triggerReminderJob}
                disabled={triggeringJob}
                size="lg"
              >
                {triggeringJob ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Trigger Reminder Job
                  </>
                )}
              </Button>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reminders</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All time reminders sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">3-Day Reminders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.day3}</div>
              <p className="text-xs text-muted-foreground">
                Early reminders sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">7-Day Reminders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.day7}</div>
              <p className="text-xs text-muted-foreground">
                Follow-up reminders sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">14-Day Reminders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.day14}</div>
              <p className="text-xs text-muted-foreground">
                Final reminders sent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reminders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reminders</CardTitle>
            <CardDescription>
              Latest profile completion reminders sent to diggers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentReminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reminders have been sent yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Reminder Type</TableHead>
                      <TableHead>Completion %</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReminders.map((reminder) => (
                      <TableRow key={reminder.id}>
                        <TableCell className="font-medium">
                          {reminder.digger.business_name}
                        </TableCell>
                        <TableCell>{reminder.profile.email}</TableCell>
                        <TableCell>
                          {getReminderTypeBadge(reminder.reminder_type)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {reminder.profile_completion_at_send}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(reminder.sent_at), "MMM d, yyyy h:mm a")}
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
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold">About Reminder System</h3>
                <p className="text-sm text-muted-foreground">
                  The reminder system automatically runs daily at 9 AM UTC. It sends emails to diggers with incomplete profiles who haven't logged in for 3, 7, or 14 days. Each reminder type is sent only once per digger to avoid spam.
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the "Trigger Reminder Job" button to manually run the reminder check and send emails immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
                  </div>
                )}

                {activeTab === "marketing" && (
                  <MarketingEmailsTab />
                )}

                {activeTab === "cold-outreach" && (
                  <ColdOutreachTab />
                )}

                {activeTab === "keywords" && (
                  <KeywordAnalyticsDashboard />
                )}

                {activeTab === "requests" && (
                  <div className="space-y-6">
            <Card>
               <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Keyword Suggestion Requests
                    </CardTitle>
                    <CardDescription>
                      User requests for new keyword suggestions by profession
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={sendTestEmail}
                      disabled={sendingTestEmail}
                      variant="default"
                      size="sm"
                    >
                      {sendingTestEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Test Email
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={checkUpgradeSavings}
                      disabled={checkingUpgrades}
                      variant="secondary"
                      size="sm"
                    >
                      {checkingUpgrades ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Check Upgrade Savings
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={loadKeywordRequests}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {keywordRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No keyword requests yet</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profession</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Processed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywordRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium capitalize">
                              {request.profession}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={request.status === "completed" ? "default" : "secondary"}
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(request.created_at), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                              {request.processed_at 
                                ? format(new Date(request.processed_at), "MMM d, yyyy h:mm a")
                                : "-"
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "pending" && (
                                <Button
                                  onClick={() => markAsProcessed(request.id)}
                                  disabled={processingRequest === request.id}
                                  variant="outline"
                                  size="sm"
                                >
                                  {processingRequest === request.id ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Mark Complete
                                    </>
                                  )}
                                </Button>
                              )}
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
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Lightbulb className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="font-semibold">About Keyword Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      Users can request keyword suggestions for professions that don't have pre-defined suggestions yet. These requests help improve the platform by identifying which professions need better keyword support.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Once you've added keywords to the suggestion system, mark requests as "Complete" to track which professions have been addressed.
                    </p>
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                      <p className="text-sm font-medium text-primary mb-1">
                        <Mail className="h-3 w-3 inline mr-1" />
                        Test Email Feature
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Test Email" to send a sample keyword request notification to all admin users. This helps verify that your email configuration is working correctly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                  </div>
                )}

                {activeTab === "cpc-data" && (
                  <CpcDataUploader />
                )}

                {activeTab === "founding-diggers" && (
                  <FoundingDiggerTab />
                )}

                {activeTab === "giveaway" && (
                  <GiveawayReportTab />
                )}
              </div>
            </main>
          </div>
        </SidebarInset>
        </div>
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;