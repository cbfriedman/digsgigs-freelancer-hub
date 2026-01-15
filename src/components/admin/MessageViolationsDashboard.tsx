import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { VIOLATION_LABELS, ViolationType } from "@/types/messageModeration";

interface ViolationRecord {
  id: string;
  user_id: string | null;
  original_message: string;
  violations: string[];
  violation_details: Record<string, any> | null;
  risk_score: number | null;
  sender_type: string | null;
  created_at: string;
  gig_id: string | null;
  bid_id: string | null;
}

interface RepeatOffender {
  user_id: string;
  violation_count: number;
  email?: string;
}

export const MessageViolationsDashboard = () => {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    last24h: 0,
    last7d: 0,
    byType: {} as Record<string, number>,
  });
  const [repeatOffenders, setRepeatOffenders] = useState<RepeatOffender[]>([]);

  useEffect(() => {
    loadViolations();
  }, []);

  const loadViolations = async () => {
    try {
      // Fetch recent violations
      const { data, error } = await supabase
        .from('message_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const typedData = (data || []) as ViolationRecord[];
      setViolations(typedData);

      // Calculate stats
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const byType: Record<string, number> = {};
      let last24h = 0;
      let last7d = 0;

      typedData.forEach((v) => {
        const createdAt = new Date(v.created_at);
        if (createdAt >= oneDayAgo) last24h++;
        if (createdAt >= sevenDaysAgo) last7d++;

        (v.violations || []).forEach((type) => {
          byType[type] = (byType[type] || 0) + 1;
        });
      });

      setStats({
        total: typedData.length,
        last24h,
        last7d,
        byType,
      });

      // Find repeat offenders (3+ violations)
      const userCounts: Record<string, number> = {};
      typedData.forEach((v) => {
        if (v.user_id) {
          userCounts[v.user_id] = (userCounts[v.user_id] || 0) + 1;
        }
      });

      const offenders = Object.entries(userCounts)
        .filter(([_, count]) => count >= 3)
        .map(([user_id, violation_count]) => ({ user_id, violation_count }))
        .sort((a, b) => b.violation_count - a.violation_count);

      setRepeatOffenders(offenders);

    } catch (error) {
      console.error('Error loading violations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 24 Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last7d}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Repeat Offenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{repeatOffenders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Violation Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Violations by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-sm">
                  {VIOLATION_LABELS[type as ViolationType] || type}: {count}
                </Badge>
              ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-muted-foreground">No violations recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Repeat Offenders */}
      {repeatOffenders.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Repeat Offenders (3+ violations)
            </CardTitle>
            <CardDescription>
              Users with multiple blocked messages may require review or suspension.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Violation Count</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repeatOffenders.map((offender) => (
                  <TableRow key={offender.user_id}>
                    <TableCell className="font-mono text-sm">
                      {offender.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{offender.violation_count} violations</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Requires Review</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Blocked Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No blocked messages yet. The AI screening system will log violations here.
            </p>
          ) : (
            <div className="space-y-4">
              {violations.slice(0, 20).map((v) => (
                <div key={v.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={v.sender_type === 'gigger' ? 'default' : 'secondary'}>
                        {v.sender_type || 'Unknown'}
                      </Badge>
                      {v.risk_score && (
                        <Badge variant={v.risk_score >= 70 ? 'destructive' : 'outline'}>
                          Risk: {v.risk_score}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {(v.violations || []).map((type, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {VIOLATION_LABELS[type as ViolationType] || type}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="bg-muted/50 rounded p-3 text-sm">
                    <p className="text-muted-foreground line-clamp-3">
                      {v.original_message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
