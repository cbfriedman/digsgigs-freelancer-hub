import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TestResult } from "@/pages/admin/TestResultsDashboard";

interface TestResultsGridProps {
  testResults: TestResult[];
  loading: boolean;
  onLogResult: (test: TestResult) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  pass: 'bg-green-100 text-green-700 border-green-300',
  fail: 'bg-red-100 text-red-700 border-red-300',
  blocked: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

const categoryIcons: Record<string, string> = {
  'Authentication': '🔐',
  'Gigger Flow': '📝',
  'Lead Unlock Preview': '🔓',
  'Bid Template Preview': '💰',
  'Live Lead Unlock': '🎯',
  'Messaging': '💬',
  'Payments': '💳',
  'Admin Dashboard': '⚙️',
  'Email Notifications': '📧',
  'Edge Cases': '🧪',
};

export function TestResultsGrid({ testResults, loading, onLogResult }: TestResultsGridProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Group tests by category
  const groupedTests = testResults.reduce((acc, test) => {
    if (!acc[test.test_category]) {
      acc[test.test_category] = [];
    }
    acc[test.test_category].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getCategoryStats = (tests: TestResult[]) => {
    const pass = tests.filter(t => t.status === 'pass').length;
    const fail = tests.filter(t => t.status === 'fail').length;
    const blocked = tests.filter(t => t.status === 'blocked').length;
    const pending = tests.filter(t => t.status === 'pending').length;
    return { pass, fail, blocked, pending, total: tests.length };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Cases by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(groupedTests).map(([category, tests]) => {
          const isOpen = openCategories.has(category);
          const stats = getCategoryStats(tests);
          
          return (
            <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-lg">{categoryIcons[category] || '📋'}</span>
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.pass > 0 && <Badge variant="outline" className="bg-green-100 text-green-700">{stats.pass} ✓</Badge>}
                    {stats.fail > 0 && <Badge variant="outline" className="bg-red-100 text-red-700">{stats.fail} ✗</Badge>}
                    {stats.blocked > 0 && <Badge variant="outline" className="bg-yellow-100 text-yellow-700">{stats.blocked} ⚠</Badge>}
                    {stats.pending > 0 && <Badge variant="outline" className="bg-gray-100 text-gray-700">{stats.pending} ○</Badge>}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {tests.map(test => (
                  <div 
                    key={test.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${statusColors[test.status]}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{test.test_id}</span>
                        <span className="font-medium">{test.test_name}</span>
                        {test.screenshot_url && (
                          <Image className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      {test.notes && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{test.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColors[test.status]}>
                        {test.status.toUpperCase()}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onLogResult(test)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
