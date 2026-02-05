import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, Send, Users, UserX, TrendingUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { EmailTemplateEditor } from "./EmailTemplateEditor";

interface EmailLog {
  id: string;
  email: string;
  email_type: string;
  reason: string | null;
  campaign_name: string | null;
  sent_at: string;
}

interface EmailStats {
  totalMarketing: number;
  totalReengagement: number;
  totalCommunity: number;
  last7Days: number;
  last30Days: number;
}

export const MarketingEmailsTab = () => {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ 
    totalMarketing: 0, 
    totalReengagement: 0,
    totalCommunity: 0,
    last7Days: 0, 
    last30Days: 0 
  });
  const [loading, setLoading] = useState(true);
  const [triggeringReengagement, setTriggeringReengagement] = useState(false);
  const [sendingMarketing, setSendingMarketing] = useState(false);
  const [sendingCommunity, setSendingCommunity] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState("");
  const [marketingName, setMarketingName] = useState("");
  const [marketingFrom, setMarketingFrom] = useState("Digs and Gigs <hello@digsandgigs.net>");
  const [marketingSubject, setMarketingSubject] = useState("This week only: Skip the wait — pros respond in hours ⚡");
  const [marketingBodyHtml, setMarketingBodyHtml] = useState("");
  const [communityEmail, setCommunityEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityAudience, setCommunityAudience] = useState<string>("single");
  const [communityLimit, setCommunityLimit] = useState("100");
  const marketingEditorGetHtmlRef = useRef<(() => string) | null>(null);

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = async () => {
    try {
      setLoading(true);
      
      // Load email logs
      const { data: logs, error: logsError } = await supabase
        .from("marketing_email_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setEmailLogs(logs || []);

      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allLogs = logs || [];
      setStats({
        totalMarketing: allLogs.filter(l => l.email_type === 'marketing').length,
        totalReengagement: allLogs.filter(l => l.email_type === 'reengagement').length,
        totalCommunity: allLogs.filter(l => l.email_type === 'community').length,
        last7Days: allLogs.filter(l => new Date(l.sent_at) >= sevenDaysAgo).length,
        last30Days: allLogs.filter(l => new Date(l.sent_at) >= thirtyDaysAgo).length,
      });

    } catch (error) {
      console.error("Error loading email data:", error);
      toast.error("Failed to load email data");
    } finally {
      setLoading(false);
    }
  };

  const triggerReengagementCheck = async () => {
    setTriggeringReengagement(true);
    try {
      const data = await invokeEdgeFunction<{ emailsSent?: number }>(supabase, "check-inactive-users");

      toast.success(`Re-engagement check completed!`, {
        description: `${data?.emailsSent || 0} emails sent to inactive users`
      });
      await loadEmailData();
    } catch (error: any) {
      console.error("Error triggering re-engagement:", error);
      toast.error("Failed to trigger re-engagement check", {
        description: error?.message
      });
    } finally {
      setTriggeringReengagement(false);
    }
  };

  const sendMarketingEmail = async () => {
    if (!marketingEmail) {
      toast.error("Please enter an email address");
      return;
    }
    if (!marketingFrom?.trim()) {
      toast.error("Please enter a From address (e.g. Name <email@domain.com>)");
      return;
    }
    if (!marketingSubject?.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    setSendingMarketing(true);
    try {
      const latestHtml = marketingEditorGetHtmlRef.current?.()?.trim() || marketingBodyHtml?.trim() || undefined;
      await invokeEdgeFunction(supabase, "send-marketing-email", {
        body: {
          email: marketingEmail,
          name: marketingName || undefined,
          campaign: "admin_manual",
          from: marketingFrom.trim(),
          subject: marketingSubject.trim(),
          html: latestHtml,
        }
      });

      toast.success("Marketing email sent!", {
        description: `Email sent to ${marketingEmail}`
      });

      await loadEmailData();
    } catch (error: any) {
      console.error("Error sending marketing email:", error);
      toast.error("Failed to send marketing email", {
        description: error?.message
      });
    } finally {
      setSendingMarketing(false);
    }
  };

  const sendCommunityEmail = async () => {
    setSendingCommunity(true);
    try {
      let body: any;
      
      if (communityAudience === 'single') {
        if (!communityEmail) {
          toast.error("Please enter an email address");
          setSendingCommunity(false);
          return;
        }
        body = {
          email: communityEmail,
          name: communityName || undefined,
        };
      } else {
        body = {
          targetAudience: communityAudience,
          limit: parseInt(communityLimit) || 100,
        };
      }

      const data = await invokeEdgeFunction<{ message?: string; sentCount?: number }>(supabase, "send-community-email", {
        body
      });

      if (communityAudience === 'single') {
        toast.success("Community email sent!", {
          description: `Email sent to ${communityEmail}`
        });
        setCommunityEmail("");
        setCommunityName("");
      } else {
        toast.success("Bulk community emails sent!", {
          description: data?.message || `Sent to ${data?.sentCount || 0} users`
        });
      }

      await loadEmailData();
    } catch (error: any) {
      console.error("Error sending community email:", error);
      toast.error("Failed to send community email", {
        description: error?.message
      });
    } finally {
      setSendingCommunity(false);
    }
  };

  const getTypeBadge = (type: string, reason: string | null) => {
    if (type === 'marketing') {
      return <Badge variant="default">Marketing</Badge>;
    }
    if (type === 'community') {
      return <Badge className="bg-purple-500 hover:bg-purple-600">Community</Badge>;
    }
    return (
      <Badge variant="secondary">
        Re-engagement {reason && `(${reason})`}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marketing</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMarketing}</div>
            <p className="text-xs text-muted-foreground">Total sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommunity}</div>
            <p className="text-xs text-muted-foreground">Launch emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Re-engagement</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReengagement}</div>
            <p className="text-xs text-muted-foreground">Inactive users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last7Days}</div>
            <p className="text-xs text-muted-foreground">Emails sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last30Days}</div>
            <p className="text-xs text-muted-foreground">Emails sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Community Email Campaign - Featured */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            🚀 Community Launch Email Campaign
          </CardTitle>
          <CardDescription>
            Announce the new Digs and Gigs Community - Forums, Project Showcases, and Pro Networking!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={communityAudience} onValueChange={setCommunityAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Email</SelectItem>
                <SelectItem value="diggers">All Diggers (Contractors)</SelectItem>
                <SelectItem value="giggers">All Giggers (Homeowners)</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {communityAudience === 'single' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="community-email">Email Address</Label>
                <Input
                  id="community-email"
                  type="email"
                  placeholder="user@example.com"
                  value={communityEmail}
                  onChange={(e) => setCommunityEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-name">Name (optional)</Label>
                <Input
                  id="community-name"
                  placeholder="John Doe"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="community-limit">Batch Limit</Label>
              <Input
                id="community-limit"
                type="number"
                placeholder="100"
                value={communityLimit}
                onChange={(e) => setCommunityLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Number of users to email in this batch (recommended: 100-500)
              </p>
            </div>
          )}

          <Button
            onClick={sendCommunityEmail}
            disabled={sendingCommunity || (communityAudience === 'single' && !communityEmail)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {sendingCommunity ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {communityAudience === 'single' ? 'Send Community Email' : `Send to ${communityAudience === 'all' ? 'All Users' : communityAudience === 'diggers' ? 'All Diggers' : 'All Giggers'}`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Other Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Re-engagement Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Re-engagement Emails
            </CardTitle>
            <CardDescription>
              Send emails to users who have been inactive for 7+ days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={triggerReengagementCheck}
              disabled={triggeringReengagement}
              className="w-full"
            >
              {triggeringReengagement ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking inactive users...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Trigger Re-engagement Check
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This runs automatically daily at 9 AM UTC. Use this button for manual triggers.
            </p>
          </CardContent>
        </Card>

        {/* Send Marketing Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Marketing Email
            </CardTitle>
            <CardDescription>
              Compose with the rich editor (emojis, images, GIFs). Set From and Subject, then send.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marketing-from">From (sender address)</Label>
              <Input
                id="marketing-from"
                type="text"
                placeholder="Digs and Gigs &lt;hello@digsandgigs.net&gt;"
                value={marketingFrom}
                onChange={(e) => setMarketingFrom(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use format: Display Name &lt;email@yourdomain.com&gt;. Domain must be verified in Resend. Deploy the <code className="text-xs">send-marketing-email</code> Edge Function for custom From/content to apply.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-subject">Subject</Label>
              <Input
                id="marketing-subject"
                type="text"
                placeholder="Your email subject"
                value={marketingSubject}
                onChange={(e) => setMarketingSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-to">To (recipient email)</Label>
              <Input
                id="marketing-to"
                type="email"
                placeholder="user@example.com"
                value={marketingEmail}
                onChange={(e) => setMarketingEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipient name (optional)</Label>
              <Input
                id="marketing-name"
                placeholder="John Doe"
                value={marketingName}
                onChange={(e) => setMarketingName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email content (rich editor)</Label>
              <EmailTemplateEditor
                value={marketingBodyHtml}
                onChange={setMarketingBodyHtml}
                getHtmlRef={marketingEditorGetHtmlRef}
                minHeight="260px"
              />
              <p className="text-xs text-muted-foreground">
                Use the toolbar for bold, lists, links, images/GIFs (paste URL), and emojis. Leave empty to use the default template.
              </p>
            </div>
            <Button
              onClick={sendMarketingEmail}
              disabled={sendingMarketing || !marketingEmail || !marketingFrom?.trim() || !marketingSubject?.trim()}
              className="w-full"
            >
              {sendingMarketing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Marketing Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Log</CardTitle>
              <CardDescription>Recent marketing, community, and re-engagement emails sent</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadEmailData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {emailLogs.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No emails sent yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.email}</TableCell>
                      <TableCell>{getTypeBadge(log.email_type, log.reason)}</TableCell>
                      <TableCell>{log.campaign_name || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(log.sent_at), "MMM d, yyyy h:mm a")}
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
            <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">About Email Campaigns</h3>
              <p className="text-sm text-muted-foreground">
                <strong>Community emails</strong> announce the new Digs and Gigs Community featuring forums, project showcases, and pro-to-pro networking.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Marketing emails</strong> are sent to attract new users to post projects. They highlight benefits like free posting, multiple quotes, and verified professionals.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Re-engagement emails</strong> are automatically sent daily to users who have been inactive for 7+ days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
