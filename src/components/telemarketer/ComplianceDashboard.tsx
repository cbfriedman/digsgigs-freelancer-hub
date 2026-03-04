import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { 
  Shield, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  FileText,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface ConsentRecord {
  id: string;
  phone: string;
  full_name: string | null;
  email: string | null;
  consent_given_at: string;
  sms_verified: boolean;
  consent_revoked: boolean;
  utm_source: string | null;
}

interface CallLog {
  id: string;
  call_initiated_at: string;
  call_duration_seconds: number | null;
  call_outcome: string | null;
  lead_qualified: boolean;
  timezone_compliant: boolean;
  consent_records: {
    phone: string;
    full_name: string | null;
  };
}

interface QueueEntry {
  id: string;
  status: string;
  attempt_count: number;
  next_attempt_at: string | null;
  created_at: string;
  consent_records: {
    phone: string;
    full_name: string | null;
  };
  dnc_scrub_results: {
    is_callable: boolean;
    block_reason: string | null;
  };
}

interface ComplianceStats {
  totalConsents: number;
  verifiedConsents: number;
  revokedConsents: number;
  callableLeads: number;
  totalCalls: number;
  qualifiedLeads: number;
}

interface ComplianceDashboardProps {
  telemarketerId: string;
}

export function ComplianceDashboard({ telemarketerId }: ComplianceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ComplianceStats>({
    totalConsents: 0,
    verifiedConsents: 0,
    revokedConsents: 0,
    callableLeads: 0,
    totalCalls: 0,
    qualifiedLeads: 0,
  });
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load consent records
      const { data: consents, error: consentsError } = await supabase
        .from("consent_records")
        .select("*")
        .eq("telemarketer_id", telemarketerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (consentsError) throw consentsError;
      setConsentRecords(consents || []);

      // Load call logs
      const { data: calls, error: callsError } = await supabase
        .from("ai_call_logs")
        .select(`
          *,
          consent_records (phone, full_name)
        `)
        .eq("telemarketer_id", telemarketerId)
        .order("call_initiated_at", { ascending: false })
        .limit(50);

      if (callsError) throw callsError;
      setCallLogs(calls || []);

      // Load queue entries
      const { data: queue, error: queueError } = await supabase
        .from("callable_leads_queue")
        .select(`
          *,
          consent_records (phone, full_name),
          dnc_scrub_results (is_callable, block_reason)
        `)
        .eq("telemarketer_id", telemarketerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (queueError) throw queueError;
      setQueueEntries(queue || []);

      // Calculate stats
      const verified = consents?.filter(c => c.sms_verified).length || 0;
      const revoked = consents?.filter(c => c.consent_revoked).length || 0;
      const callable = queue?.filter(q => q.status === "pending").length || 0;
      const qualified = calls?.filter(c => c.lead_qualified).length || 0;

      setStats({
        totalConsents: consents?.length || 0,
        verifiedConsents: verified,
        revokedConsents: revoked,
        callableLeads: callable,
        totalCalls: calls?.length || 0,
        qualifiedLeads: qualified,
      });
    } catch (error: any) {
      console.error("Error loading compliance data:", error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (telemarketerId) {
      loadData();
    }
  }, [telemarketerId]);

  const maskPhone = (phone: string) => {
    if (!phone) return "N/A";
    return `***-***-${phone.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "calling":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Calling</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case "skipped":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.totalConsents}</div>
            <div className="text-xs text-muted-foreground">Total Consents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.verifiedConsents}</div>
            <div className="text-xs text-muted-foreground">Verified</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">{stats.revokedConsents}</div>
            <div className="text-xs text-muted-foreground">Revoked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.callableLeads}</div>
            <div className="text-xs text-muted-foreground">In Queue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <PhoneCall className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
            <div className="text-xs text-muted-foreground">Calls Made</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold">{stats.qualifiedLeads}</div>
            <div className="text-xs text-muted-foreground">Qualified</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue">Call Queue</TabsTrigger>
          <TabsTrigger value="consents">Consent Records</TabsTrigger>
          <TabsTrigger value="calls">Call Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Callable Leads Queue</CardTitle>
              <CardDescription>Leads ready for AI calling</CardDescription>
            </CardHeader>
            <CardContent>
              {queueEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No leads in queue</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Next Call</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">
                          {maskPhone(entry.consent_records?.phone || "")}
                        </TableCell>
                        <TableCell>{entry.consent_records?.full_name || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>{entry.attempt_count}/3</TableCell>
                        <TableCell>
                          {entry.next_attempt_at 
                            ? format(new Date(entry.next_attempt_at), "MMM d, h:mm a")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">PEWC Consent Records</CardTitle>
              <CardDescription>All collected consent records (5-year retention)</CardDescription>
            </CardHeader>
            <CardContent>
              {consentRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No consent records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">
                          {maskPhone(record.phone)}
                        </TableCell>
                        <TableCell>{record.full_name || "N/A"}</TableCell>
                        <TableCell>
                          {format(new Date(record.consent_given_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {record.sms_verified 
                            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                            : <Clock className="w-4 h-4 text-yellow-600" />}
                        </TableCell>
                        <TableCell>
                          {record.consent_revoked 
                            ? <Badge variant="destructive">Revoked</Badge>
                            : <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>}
                        </TableCell>
                        <TableCell>{record.utm_source || "Direct"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">AI Call Logs</CardTitle>
              <CardDescription>All AI-initiated calls with recordings</CardDescription>
            </CardHeader>
            <CardContent>
              {callLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No call logs yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Called At</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Qualified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono">
                          {maskPhone(log.consent_records?.phone || "")}
                        </TableCell>
                        <TableCell>{log.consent_records?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          {format(new Date(log.call_initiated_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          {log.call_duration_seconds 
                            ? `${Math.floor(log.call_duration_seconds / 60)}:${(log.call_duration_seconds % 60).toString().padStart(2, "0")}`
                            : "—"}
                        </TableCell>
                        <TableCell>{log.call_outcome || "N/A"}</TableCell>
                        <TableCell>
                          {log.lead_qualified 
                            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                            : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compliance Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-1">TCPA Compliance Active</p>
              <p className="text-muted-foreground">
                All calls are made only to verified PEWC consent holders, after DNC scrubbing, 
                within allowed hours (8am-9pm local time), and with full recording for compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
