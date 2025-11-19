import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Hash } from "lucide-react";

export default function LeadNumberingExplainer() {
  const monthlyExample = [
    { month: "JAN", leads: ["JAN#1", "JAN#2", "JAN#3", "...", "JAN#10"], tier: "Standard Rate", color: "text-blue-600" },
    { month: "FEB", leads: ["FEB#1", "FEB#2", "...", "FEB#15"], tier: "Volume Discount (11-50)", color: "text-purple-600" },
    { month: "MAR", leads: ["MAR#1", "MAR#2", "...", "MAR#55"], tier: "Best Rate (51+)", color: "text-amber-600" },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Hash className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Lead Numbering System</CardTitle>
            <CardDescription className="mt-2">
              Every lead you receive is automatically numbered by month for easy tracking
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* How It Works */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-accent/30 rounded-lg border border-accent">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              How It Works
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Each month starts fresh at lead #1</li>
              <li>✓ Format: <code className="px-1.5 py-0.5 bg-background rounded text-foreground">MONTH#NUMBER</code></li>
              <li>✓ Example: Your 5th lead in January is <strong>JAN#5</strong></li>
              <li>✓ Resets on the 1st of each month</li>
              <li>✓ Pricing tier adjusts automatically based on your monthly count</li>
            </ul>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Why Numbered?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ <strong>Easy Tracking:</strong> Reference specific leads in support</li>
              <li>✓ <strong>Transparent Billing:</strong> See exactly which tier each lead falls into</li>
              <li>✓ <strong>Volume Monitoring:</strong> Know where you are in your monthly count</li>
              <li>✓ <strong>Historical Records:</strong> Track performance month-over-month</li>
            </ul>
          </div>
        </div>

        {/* Monthly Examples */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Monthly Lead Tracking Example</h3>
          <div className="space-y-3">
            {monthlyExample.map((example) => (
              <Card key={example.month} className="bg-gradient-to-r from-background to-accent/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                        {example.month}
                      </Badge>
                      <div className="flex flex-wrap gap-1.5">
                        {example.leads.map((lead, idx) => (
                          <code
                            key={idx}
                            className={`px-2 py-1 bg-background rounded text-xs font-mono ${
                              lead === "..." ? "text-muted-foreground" : "text-foreground border border-border"
                            }`}
                          >
                            {lead}
                          </code>
                        ))}
                      </div>
                    </div>
                    <Badge className={`whitespace-nowrap ${example.color}`} variant="outline">
                      {example.tier}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Tier Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-3 px-4 font-semibold">Lead Numbers</th>
                <th className="text-left py-3 px-4 font-semibold">Pricing Tier</th>
                <th className="text-left py-3 px-4 font-semibold">Example Range</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 hover:bg-accent/5">
                <td className="py-3 px-4 font-mono text-blue-600">Lead #1 - #10</td>
                <td className="py-3 px-4">Standard Rate</td>
                <td className="py-3 px-4 text-xs">
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#1</code> to{" "}
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#10</code>
                </td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-accent/5">
                <td className="py-3 px-4 font-mono text-purple-600">Lead #11 - #50</td>
                <td className="py-3 px-4">Volume Discount</td>
                <td className="py-3 px-4 text-xs">
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#11</code> to{" "}
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#50</code>
                </td>
              </tr>
              <tr className="border-b border-border/50 hover:bg-accent/5">
                <td className="py-3 px-4 font-mono text-amber-600">Lead #51+</td>
                <td className="py-3 px-4">Best Bulk Rate</td>
                <td className="py-3 px-4 text-xs">
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#51</code>,{" "}
                  <code className="px-2 py-1 bg-background rounded border border-border">JAN#52</code>, etc.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Note */}
        <div className="p-4 bg-accent/20 rounded-lg border border-accent text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">💡 Pro Tip:</strong> Keep track of your lead numbers throughout the month 
            to see when you'll hit the next pricing tier. The more leads you receive, the lower your per-lead cost becomes!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
