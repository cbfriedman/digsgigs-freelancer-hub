import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Mail, Calendar, Download, FileText, Filter, X } from "lucide-react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface AlertAnalytics {
  id: string;
  saved_search_id: string;
  matches_found: number;
  sent_at: string;
  search_type: string;
}

interface SavedSearch {
  id: string;
  name: string;
}

interface SavedSearchAnalyticsProps {
  searchType: 'gigs' | 'diggers';
}

export const SavedSearchAnalytics = ({ searchType }: SavedSearchAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AlertAnalytics[]>([]);
  const [allAnalytics, setAllAnalytics] = useState<AlertAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchNames, setSearchNames] = useState<{ [key: string]: string }>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  // Filter states
  const [dateRange, setDateRange] = useState<string>("30");
  const [selectedSearchId, setSelectedSearchId] = useState<string>("all");
  const [minMatches, setMinMatches] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    loadAnalytics();
  }, [searchType]);

  useEffect(() => {
    applyFilters();
  }, [allAnalytics, dateRange, selectedSearchId, minMatches, startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get analytics from last 90 days (we'll filter in client)
      const ninetyDaysAgo = startOfDay(subDays(new Date(), 90));

      const { data, error } = await supabase
        .from('saved_search_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('search_type', searchType)
        .gte('sent_at', ninetyDaysAgo.toISOString())
        .order('sent_at', { ascending: true });

      if (error) throw error;

      setAllAnalytics(data || []);

      // Load all saved searches for filter dropdown
      const { data: searchesData } = await supabase
        .from('saved_searches')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('search_type', searchType)
        .order('name');

      setSavedSearches(searchesData || []);
      
      // Get all search names
      const names: { [key: string]: string } = {};
      searchesData?.forEach(s => {
        names[s.id] = s.name;
      });
      setSearchNames(names);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allAnalytics];

    // Date range filter
    if (dateRange === "custom" && startDate && endDate) {
      const start = startOfDay(parseISO(startDate));
      const end = startOfDay(parseISO(endDate));
      filtered = filtered.filter(alert => {
        const alertDate = startOfDay(parseISO(alert.sent_at));
        return alertDate >= start && alertDate <= end;
      });
    } else if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoffDate = startOfDay(subDays(new Date(), days));
      filtered = filtered.filter(alert => 
        startOfDay(parseISO(alert.sent_at)) >= cutoffDate
      );
    }

    // Search filter
    if (selectedSearchId !== "all") {
      filtered = filtered.filter(alert => alert.saved_search_id === selectedSearchId);
    }

    // Min matches filter
    if (minMatches && !isNaN(parseInt(minMatches))) {
      const min = parseInt(minMatches);
      filtered = filtered.filter(alert => alert.matches_found >= min);
    }

    setAnalytics(filtered);
    setTotalAlerts(filtered.length);
    setTotalMatches(filtered.reduce((sum, alert) => sum + alert.matches_found, 0));
  };

  const clearFilters = () => {
    setDateRange("30");
    setSelectedSearchId("all");
    setMinMatches("");
    setStartDate("");
    setEndDate("");
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

  const exportToCSV = () => {
    try {
      // Create CSV header
      const header = ['Date', 'Search Name', 'Matches Found', 'Alert Sent At'];
      
      // Create CSV rows
      const rows = analytics.map(alert => [
        format(new Date(alert.sent_at), 'MMM dd, yyyy'),
        searchNames[alert.saved_search_id] || 'Unknown',
        alert.matches_found.toString(),
        format(new Date(alert.sent_at), 'MMM dd, yyyy h:mm a'),
      ]);

      // Combine header and rows
      const csvContent = [
        header.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `saved-search-analytics-${searchType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Analytics exported to CSV');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Saved Search Analytics - ${searchType === 'gigs' ? 'Gigs' : 'Diggers'}`, 14, 20);
      
      // Add summary stats
      doc.setFontSize(12);
      doc.text(`Report Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 30);
      doc.text(`Total Alerts Sent: ${totalAlerts}`, 14, 38);
      doc.text(`Total Matches Found: ${totalMatches}`, 14, 46);
      doc.text(`Average Matches Per Alert: ${totalAlerts > 0 ? (totalMatches / totalAlerts).toFixed(1) : 0}`, 14, 54);

      // Add table
      const tableData = analytics.map(alert => [
        format(new Date(alert.sent_at), 'MMM dd, yyyy'),
        searchNames[alert.saved_search_id] || 'Unknown',
        alert.matches_found.toString(),
        format(new Date(alert.sent_at), 'h:mm a'),
      ]);

      autoTable(doc, {
        head: [['Date', 'Search Name', 'Matches', 'Time']],
        body: tableData,
        startY: 65,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
      });

      // Save PDF
      doc.save(`saved-search-analytics-${searchType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast.success('Analytics exported to PDF');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

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
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Saved Search Filter */}
            <div className="space-y-2">
              <Label>Saved Search</Label>
              <Select value={selectedSearchId} onValueChange={setSelectedSearchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All searches</SelectItem>
                  {savedSearches.map(search => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Matches Filter */}
            <div className="space-y-2">
              <Label>Min Matches</Label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={minMatches}
                onChange={(e) => setMinMatches(e.target.value)}
                min="0"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="space-y-2">
              <Label className="opacity-0">Clear</Label>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

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
