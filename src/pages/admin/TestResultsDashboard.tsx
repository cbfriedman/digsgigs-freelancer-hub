import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, RefreshCw, Download, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { TestResultsGrid } from "@/components/admin/testing/TestResultsGrid";
import { TestProgressSummary } from "@/components/admin/testing/TestProgressSummary";
import { TestActivityFeed } from "@/components/admin/testing/TestActivityFeed";
import { LogTestResultModal } from "@/components/admin/testing/LogTestResultModal";

export interface TestResult {
  id: string;
  test_category: string;
  test_id: string;
  test_name: string;
  status: 'pending' | 'pass' | 'fail' | 'blocked';
  environment: 'lovable_preview' | 'vercel_production';
  notes: string | null;
  screenshot_url: string | null;
  tester_id: string | null;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function TestResultsDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<'lovable_preview' | 'vercel_production'>('lovable_preview');
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTestResults = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('manual_test_results')
      .select('*')
      .eq('environment', environment)
      .order('test_category', { ascending: true })
      .order('test_id', { ascending: true });

    if (error) {
      toast({
        title: "Error loading test results",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTestResults(data as TestResult[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTestResults();
  }, [environment]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('manual_test_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manual_test_results',
          filter: `environment=eq.${environment}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTestResults(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as TestResult : t)
            );
            toast({
              title: "Test updated",
              description: `${(payload.new as TestResult).test_name} - ${(payload.new as TestResult).status.toUpperCase()}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [environment]);

  const handleLogResult = (test: TestResult) => {
    setSelectedTest(test);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Test ID', 'Category', 'Name', 'Status', 'Notes', 'Tested At'];
    const rows = testResults.map(t => [
      t.test_id,
      t.test_category,
      t.test_name,
      t.status,
      t.notes || '',
      t.tested_at || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${environment}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = {
    total: testResults.length,
    pass: testResults.filter(t => t.status === 'pass').length,
    fail: testResults.filter(t => t.status === 'fail').length,
    blocked: testResults.filter(t => t.status === 'blocked').length,
    pending: testResults.filter(t => t.status === 'pending').length,
  };

  const progressPercent = stats.total > 0 
    ? Math.round(((stats.pass + stats.fail + stats.blocked) / stats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Test Results Dashboard</h1>
              <p className="text-muted-foreground">Manual QA testing for Hongqiang</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchTestResults} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Environment Toggle */}
        <div className="mb-6">
          <Tabs value={environment} onValueChange={(v) => setEnvironment(v as typeof environment)}>
            <TabsList>
              <TabsTrigger value="lovable_preview">
                Lovable Preview
              </TabsTrigger>
              <TabsTrigger value="vercel_production">
                Vercel Production
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Progress Summary */}
        <TestProgressSummary stats={stats} progressPercent={progressPercent} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Test Grid - 2 columns */}
          <div className="lg:col-span-2">
            <TestResultsGrid 
              testResults={testResults} 
              loading={loading}
              onLogResult={handleLogResult}
            />
          </div>

          {/* Activity Feed - 1 column */}
          <div>
            <TestActivityFeed 
              testResults={testResults.filter(t => t.tested_at)} 
            />
          </div>
        </div>

        {/* Log Result Modal */}
        <LogTestResultModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTest(null);
          }}
          test={selectedTest}
          environment={environment}
          onSuccess={fetchTestResults}
        />
      </div>
    </div>
  );
}
