import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Save, Lightbulb, Users, AlertTriangle, MessageSquare, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface NotificationPreferences {
  keyword_requests_enabled: boolean;
  profile_reminders_enabled: boolean;
  lead_issues_enabled: boolean;
  bid_notifications_enabled: boolean;
  system_alerts_enabled: boolean;
  report_frequency: string;
  digest_enabled?: boolean;
  digest_frequency?: 'daily' | 'weekly';
}

const AdminNotificationPreferences = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    keyword_requests_enabled: true,
    profile_reminders_enabled: true,
    lead_issues_enabled: true,
    bid_notifications_enabled: true,
    system_alerts_enabled: true,
    report_frequency: "weekly",
    digest_enabled: false,
    digest_frequency: "daily",
  });

  useEffect(() => {
    checkAdminAndLoadPreferences();
  }, []);

  const checkAdminAndLoadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to access this page");
        navigate("/register");
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
      await loadPreferences(user.id);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          keyword_requests_enabled: data.keyword_requests_enabled ?? true,
          profile_reminders_enabled: data.profile_reminders_enabled ?? true,
          lead_issues_enabled: data.lead_issues_enabled ?? true,
          bid_notifications_enabled: data.bid_notifications_enabled ?? true,
          system_alerts_enabled: data.system_alerts_enabled ?? true,
          report_frequency: data.report_frequency ?? "weekly",
        });
      } else {
        // Create default preferences if they don't exist
        const { error: insertError } = await supabase
          .from("email_preferences")
          .insert({
            user_id: userId,
            enabled: true,
            report_frequency: "weekly",
          });

        if (insertError) {
          console.error("Error creating preferences:", insertError);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast.error("Failed to load notification preferences");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("email_preferences")
        .update(preferences)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Notification preferences saved successfully");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="mt-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notification Preferences
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage which email notifications you want to receive as an admin
            </p>
          </div>
        </div>

        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Keyword Requests */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <Lightbulb className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="keyword_requests" className="text-base font-medium">
                      Keyword Request Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when users request new keyword suggestions for professions
                    </p>
                  </div>
                </div>
                <Switch
                  id="keyword_requests"
                  checked={preferences.keyword_requests_enabled}
                  onCheckedChange={() => togglePreference("keyword_requests_enabled")}
                />
              </div>

              <Separator />

              {/* Profile Reminders */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <Users className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="profile_reminders" className="text-base font-medium">
                      Profile Reminder Reports
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive summaries of profile completion reminder activities
                    </p>
                  </div>
                </div>
                <Switch
                  id="profile_reminders"
                  checked={preferences.profile_reminders_enabled}
                  onCheckedChange={() => togglePreference("profile_reminders_enabled")}
                />
              </div>

              <Separator />

              {/* Lead Issues */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <AlertTriangle className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="lead_issues" className="text-base font-medium">
                      Lead Return & Issue Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about lead return requests and quality issues
                    </p>
                  </div>
                </div>
                <Switch
                  id="lead_issues"
                  checked={preferences.lead_issues_enabled}
                  onCheckedChange={() => togglePreference("lead_issues_enabled")}
                />
              </div>

              <Separator />

              {/* Bid Notifications */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <MessageSquare className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="bid_notifications" className="text-base font-medium">
                      Bid Activity Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts about unusual bid patterns or disputed bids
                    </p>
                  </div>
                </div>
                <Switch
                  id="bid_notifications"
                  checked={preferences.bid_notifications_enabled}
                  onCheckedChange={() => togglePreference("bid_notifications_enabled")}
                />
              </div>

              <Separator />

              {/* System Alerts */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <Shield className="h-5 w-5 text-destructive mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="system_alerts" className="text-base font-medium">
                      Critical System Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Important system notifications (cannot be disabled)
                    </p>
                  </div>
                </div>
                <Switch
                  id="system_alerts"
                  checked={preferences.system_alerts_enabled}
                  onCheckedChange={() => togglePreference("system_alerts_enabled")}
                  disabled
                />
              </div>

              <Separator />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Digest Settings Card */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email Digest Settings</CardTitle>
              </div>
              <CardDescription>
                Batch multiple notifications into a single summary email instead of receiving individual notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Digest Toggle */}
              <div className="flex items-start justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="digest_enabled" className="text-base font-medium">
                      Enable Email Digest
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive batched notifications instead of individual emails for each event
                    </p>
                  </div>
                </div>
                <Switch
                  id="digest_enabled"
                  checked={preferences.digest_enabled ?? false}
                  onCheckedChange={() => togglePreference("digest_enabled")}
                />
              </div>

              {/* Digest Frequency Selector */}
              {preferences.digest_enabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label htmlFor="digest_frequency" className="text-base font-medium">
                      Digest Frequency
                    </Label>
                    <select
                      id="digest_frequency"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={preferences.digest_frequency ?? 'daily'}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        digest_frequency: e.target.value as 'daily' | 'weekly'
                      }))}
                    >
                      <option value="daily">Daily (sent at 9 AM)</option>
                      <option value="weekly">Weekly (sent Monday at 9 AM)</option>
                    </select>
                    <p className="text-sm text-muted-foreground">
                      Choose how often you want to receive digest emails with batched notifications
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <h3 className="font-semibold">About Admin Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    As an admin, you can customize which email notifications you receive. Your preferences are saved automatically and will apply to all future notifications.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Note: Critical system alerts cannot be disabled as they contain important information about platform health and security.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPreferences;