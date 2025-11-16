import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Mail, Calendar } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface AlertAnalytics {
  id: string;
  saved_search_id: string;
  matches_found: number;
  sent_at: string;
  search_type: string;
}

interface SavedSearchAnalyticsProps {
  searchType: 'gigs' | 'diggers';
}

export const SavedSearchAnalytics = ({ searchType }: SavedSearchAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AlertAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, [searchType]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get analytics from last 30 days
      const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

      const { data, error } = await supabase
        .from('saved_search_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('search_type', searchType)
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .order('sent_at', { ascending: true });

      if (error) throw error;

      setAnalytics(data || []);
      
      // Calculate totals
      const alerts = data || [];
      setTotalAlerts(alerts.length);
      setTotalMatches(alerts.reduce((sum, alert) => sum + alert.matches_found, 0));
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group data by date for chart
  const chartData = analytics.reduce((acc, alert) => {
    const date = format(new Date(alert.sent_at), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.matches += alert.matches_found;
      existing.alerts += 1;
    } else {
      acc.push({
        date,
        matches: alert.matches_found,
        alerts: 1,
      });
    }
    
    return acc;
  }, [] as { date: string; matches: number; alerts: number }[]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (analytics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No email alerts sent yet. Enable alerts on your saved searches to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Total Alerts Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Matches Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMatches}</div>
            <p className="text-xs text-muted-foreground">Across all alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Avg. Matches Per Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAlerts > 0 ? (totalMatches / totalAlerts).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per email sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Activity Over Time</CardTitle>
          <CardDescription>
            Number of matches found and alerts sent in the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="matches" fill="hsl(var(--primary))" name="Matches Found" />
              <Bar dataKey="alerts" fill="hsl(var(--accent))" name="Alerts Sent" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
