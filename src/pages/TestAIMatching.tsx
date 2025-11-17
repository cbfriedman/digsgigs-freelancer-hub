import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TestLog {
  step: string;
  timestamp: string;
  data?: any;
  success: boolean;
  error?: string;
}

interface TestSummary {
  ai_matching: {
    sic_codes: string[];
    naics_codes: string[];
    reasoning: string;
  };
  diggers: {
    total_with_codes: number;
    would_be_notified: number;
    matching_details: any[];
  };
  notifications: {
    recent_count: number;
    notifications: any[];
  };
}

export default function TestAIMatching() {
  const [gigTitle, setGigTitle] = useState("Kitchen Renovation");
  const [gigDescription, setGigDescription] = useState("Looking for a contractor to renovate my kitchen. Need cabinets installed, countertops, and plumbing work.");
  const [gigCategory, setGigCategory] = useState("Construction");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);

  const runTest = async () => {
    setLoading(true);
    setLogs([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-ai-matching', {
        body: {
          gigTitle,
          gigDescription,
          gigCategory
        }
      });

      if (error) throw error;

      if (data.success) {
        setLogs(data.logs);
        setSummary(data.summary);
        toast.success("AI matching test completed successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Test failed:", error);
      toast.error(error.message || "Test failed");
      setLogs([{
        step: "Test failed",
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Matching Test Suite</h1>
        <p className="text-muted-foreground">
          Test the complete AI-powered gig → digger matching workflow
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Gig Input</CardTitle>
          <CardDescription>
            Enter gig details to test how the AI matches them to diggers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Gig Title</Label>
            <Input
              id="title"
              value={gigTitle}
              onChange={(e) => setGigTitle(e.target.value)}
              placeholder="e.g., Kitchen Renovation"
            />
          </div>

          <div>
            <Label htmlFor="description">Gig Description</Label>
            <Textarea
              id="description"
              value={gigDescription}
              onChange={(e) => setGigDescription(e.target.value)}
              placeholder="Detailed description of the work needed..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={gigCategory}
              onChange={(e) => setGigCategory(e.target.value)}
              placeholder="e.g., Construction, Plumbing"
            />
          </div>

          <Button
            onClick={runTest}
            disabled={loading || !gigTitle || !gigDescription}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              "Run AI Matching Test"
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Matching Results */}
            <div>
              <h3 className="font-semibold mb-3">AI-Matched Industry Codes</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-muted-foreground">SIC Codes</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {summary.ai_matching.sic_codes.map((code) => (
                      <Badge key={code} variant="secondary">{code}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">NAICS Codes</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {summary.ai_matching.naics_codes.map((code) => (
                      <Badge key={code} variant="secondary">{code}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">AI Reasoning</Label>
                  <p className="text-sm mt-1">{summary.ai_matching.reasoning}</p>
                </div>
              </div>
            </div>

            {/* Matching Diggers */}
            <div>
              <h3 className="font-semibold mb-3">Matching Results</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Total Diggers with Industry Codes</span>
                  <Badge>{summary.diggers.total_with_codes}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Diggers That Would Be Notified</span>
                  <Badge variant={summary.diggers.would_be_notified > 0 ? "default" : "secondary"}>
                    {summary.diggers.would_be_notified}
                  </Badge>
                </div>
              </div>

              {summary.diggers.matching_details.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm text-muted-foreground">Matched Diggers</Label>
                  {summary.diggers.matching_details.map((digger: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="font-medium">{digger.business_name}</div>
                      <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                        {digger.matched_sic && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            SIC: {digger.sic_code}
                          </span>
                        )}
                        {digger.matched_naics && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            NAICS: {digger.naics_code}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div>
              <h3 className="font-semibold mb-3">Recent Notifications (Last 5 minutes)</h3>
              {summary.notifications.recent_count > 0 ? (
                <div className="space-y-2">
                  {summary.notifications.notifications.map((notif: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="font-medium">{notif.title}</div>
                      <div className="text-sm text-muted-foreground">{notif.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No notifications sent in the last 5 minutes
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="mt-0.5">{getStatusIcon(log.success)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{log.step}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    {log.error && (
                      <div className="text-sm text-destructive mt-1">{log.error}</div>
                    )}
                    {log.data && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer">View data</summary>
                        <pre className="text-xs mt-2 p-2 bg-background rounded overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
