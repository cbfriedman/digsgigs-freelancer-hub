import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TestResult } from "@/pages/admin/TestResultsDashboard";

interface TestActivityFeedProps {
  testResults: TestResult[];
}

const statusIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  fail: <XCircle className="h-4 w-4 text-red-600" />,
  blocked: <AlertCircle className="h-4 w-4 text-yellow-600" />,
};

export function TestActivityFeed({ testResults }: TestActivityFeedProps) {
  // Sort by tested_at descending
  const recentTests = [...testResults]
    .filter(t => t.tested_at)
    .sort((a, b) => new Date(b.tested_at!).getTime() - new Date(a.tested_at!).getTime())
    .slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {recentTests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No test results logged yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentTests.map(test => (
                <div key={test.id} className="flex gap-3 pb-4 border-b last:border-0">
                  <div className="mt-1">
                    {statusIcons[test.status]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{test.test_id}</span>
                      <Badge variant="outline" className="text-xs">
                        {test.test_category}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">{test.test_name}</p>
                    {test.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {test.tested_at && formatDistanceToNow(new Date(test.tested_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
