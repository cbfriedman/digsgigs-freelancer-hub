import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, RefreshCw, TrendingUp, Users, Clock, CheckCircle2, Lightbulb, MessageSquare, Settings, Shield, Database, FlaskConical, Megaphone, MailPlus, Crown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { KeywordAnalyticsDashboard } from "@/components/KeywordAnalyticsDashboard";
import { CpcDataUploader } from "@/components/CpcDataUploader";
import { MarketingEmailsTab } from "@/components/admin/MarketingEmailsTab";
import { ColdOutreachTab } from "@/components/admin/ColdOutreachTab";
import { FoundingDiggerTab } from "@/components/admin/FoundingDiggerTab";
import { SignupAnalyticsDashboard } from "@/components/admin/SignupAnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [stats, setStats] = useState<ReminderStats>({ total: 0, day3: 0, day7: 0, day14: 0 });
  const [recentReminders, setRecentReminders] = useState<ReminderRecord[]>([]);
  const [triggeringJob, setTriggeringJob] = useState(false);
  const [keywordRequests, setKeywordRequests] = useState<KeywordRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [checkingUpgrades, setCheckingUpgrades] = useState(false);

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

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const triggerReminderJob = async () => {
    setTriggeringJob(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-profile-reminders", {
        body: { manual_trigger: true },
      });

      if (error) throw error;

      toast.success(`Reminder job completed! ${data.remindersSent} reminders sent.`);
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error triggering reminder job:", error);
      toast.error("Failed to trigger reminder job: " + error.message);
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
      const { data, error } = await supabase.functions.invoke('notify-keyword-request', {
        body: { 
          profession: 'Test Profession (Software Developer)',
          requestId: 'test-' + Date.now()
        }
      });

      if (error) throw error;

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
      const { data, error } = await supabase.functions.invoke('check-upgrade-savings');

      if (error) throw error;

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="text-center space-x-4">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage reminders and analytics</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
            >
              <Shield className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/notifications")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Notification Settings
            </Button>
            <Button
              variant="default"
              onClick={() => navigate("/admin/lead-distribution-test")}
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              Lead Distribution Test
            </Button>
          </div>
        </div>

        <Tabs defaultValue="signup-analytics" className="w-full">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="signup-analytics" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Signup Analytics
            </TabsTrigger>
            <TabsTrigger value="reminders">Profile Reminders</TabsTrigger>
            <TabsTrigger value="founding-diggers" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Founding Diggers
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-1">
              <Megaphone className="h-3 w-3" />
              Marketing Emails
            </TabsTrigger>
            <TabsTrigger value="cold-outreach" className="flex items-center gap-1">
              <MailPlus className="h-3 w-3" />
              Cold Outreach
            </TabsTrigger>
            <TabsTrigger value="keywords">Keyword Analytics</TabsTrigger>
            <TabsTrigger value="requests">Keyword Requests</TabsTrigger>
            <TabsTrigger value="cpc-data" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              CPC Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signup-analytics">
            <SignupAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="marketing">
            <MarketingEmailsTab />
          </TabsContent>

          <TabsContent value="cold-outreach">
            <ColdOutreachTab />
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="cpc-data">
            <CpcDataUploader />
          </TabsContent>

          <TabsContent value="founding-diggers">
            <FoundingDiggerTab />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;