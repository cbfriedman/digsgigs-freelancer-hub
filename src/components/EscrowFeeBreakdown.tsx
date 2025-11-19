import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function EscrowFeeBreakdown() {
  const examples = [
    { projectValue: 1000, escrowFee: 90, diggerReceives: 910 },
    { projectValue: 5000, escrowFee: 450, diggerReceives: 4550 },
    { projectValue: 10000, escrowFee: 900, diggerReceives: 9100 },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl">Understanding Escrow Fees</CardTitle>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Optional Feature
              </Badge>
            </div>
            <CardDescription className="mt-2">
              Escrow is only used when gig posters request payment protection. Our transparent 9% fee protects both parties when escrow is chosen.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            9% Flat Rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* When Escrow is Used */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            When is Escrow Used?
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Escrow is <strong>optional</strong> and only applied when the gig poster requests payment protection for their project. The 9% escrow fee is charged to the digger only when this protection is requested.
          </p>
        </div>

        {/* What Escrow Protects */}
        <div className="p-4 bg-accent/30 rounded-lg border border-accent">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            What Escrow Protects (When Used)
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ <strong>Payment Security:</strong> Funds are held safely until work is completed</li>
            <li>✓ <strong>Dispute Resolution:</strong> Professional mediation if issues arise</li>
            <li>✓ <strong>Milestone-Based Release:</strong> Pay as work progresses</li>
            <li>✓ <strong>Quality Assurance:</strong> Review work before final payment</li>
          </ul>
        </div>

        {/* Example Calculations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Example Calculations (When Escrow is Requested)</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {examples.map((example) => (
              <Card key={example.projectValue} className="bg-gradient-to-br from-background to-accent/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      ${example.projectValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Project Value
                    </div>
                    
                    <div className="h-px bg-border my-3" />
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Escrow Fee (9%):</span>
                        <span className="font-semibold text-red-600">-${example.escrowFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing (min $10):</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-semibold text-red-600 cursor-help">-$10</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Standard processing fee covers payment infrastructure and security</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="h-px bg-border my-3" />
                    
                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground mb-1">You Receive</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${(example.diggerReceives - 10).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Fee Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Project Value</th>
                <th className="text-right py-3 px-4 font-semibold">Escrow Fee (9%)</th>
                <th className="text-right py-3 px-4 font-semibold">Processing Fee</th>
                <th className="text-right py-3 px-4 font-semibold text-green-600">You Receive</th>
              </tr>
            </thead>
            <tbody>
              {[500, 1000, 2500, 5000, 7500, 10000, 15000, 20000].map((value) => {
                const escrow = value * 0.09;
                const processing = 10; // Minimum processing fee
                const netAmount = value - escrow - processing;
                
                return (
                  <tr key={value} className="border-b border-border/50 hover:bg-accent/5">
                    <td className="py-2 px-4">${value.toLocaleString()}</td>
                    <td className="text-right py-2 px-4 text-red-600">-${escrow.toFixed(0)}</td>
                    <td className="text-right py-2 px-4 text-red-600">-${processing}</td>
                    <td className="text-right py-2 px-4 font-semibold text-green-600">
                      ${netAmount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Note */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Note:</strong> All fees are the same across all volume tiers (1-10, 11-50, 51+ leads per month). 
            The escrow fee ensures secure transactions and protects both the service provider and client throughout the project lifecycle.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
