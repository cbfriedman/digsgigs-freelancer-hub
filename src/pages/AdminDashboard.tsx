import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, RefreshCw, TrendingUp, Users, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<ReminderStats>({ total: 0, day3: 0, day7: 0, day14: 0 });
  const [recentReminders, setRecentReminders] = useState<ReminderRecord[]>([]);
  const [triggeringJob, setTriggeringJob] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to access this page");
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (rolesError) {
        console.error("Error checking admin status:", rolesError);
      }

      if (!roles) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage profile completion reminders</p>
            </div>
          </div>
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
    </div>
  );
};

export default AdminDashboard;