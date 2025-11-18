import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const HourlyUpchargeCalculator = () => {
  const [minRate, setMinRate] = useState<string>("50");
  const [maxRate, setMaxRate] = useState<string>("100");

  const calculateUpcharge = (min: number, max: number, multiplier: number) => {
    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) return 0;
    const average = (min + max) / 2;
    return average * multiplier;
  };

  const minNum = parseFloat(minRate) || 0;
  const maxNum = parseFloat(maxRate) || 0;
  const avgRate = minNum > 0 && maxNum > 0 ? (minNum + maxNum) / 2 : 0;

  const tiers = [
    { name: "Free", multiplier: 3, color: "text-muted-foreground" },
    { name: "Pro", multiplier: 2, color: "text-primary" },
    { name: "Premium", multiplier: 1, color: "text-accent" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle>Hourly Upcharge Calculator</CardTitle>
        <CardDescription>
          Enter your hourly rate range to see how award upcharges compare across subscription tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minRate">Minimum Hourly Rate ($)</Label>
            <Input
              id="minRate"
              type="number"
              min="0"
              step="5"
              value={minRate}
              onChange={(e) => setMinRate(e.target.value)}
              placeholder="50"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxRate">Maximum Hourly Rate ($)</Label>
            <Input
              id="maxRate"
              type="number"
              min="0"
              step="5"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="100"
              className="text-lg"
            />
          </div>
        </div>

        {avgRate > 0 && (
          <>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Average Hourly Rate</p>
              <p className="text-3xl font-bold text-primary">${avgRate.toFixed(2)}/hr</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Award Upcharge by Tier
              </h4>
              {tiers.map((tier) => {
                const upcharge = calculateUpcharge(minNum, maxNum, tier.multiplier);
                return (
                  <div
                    key={tier.name}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{tier.name} Plan</p>
                      <p className="text-xs text-muted-foreground">
                        ${avgRate.toFixed(2)} × {tier.multiplier} hours
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${tier.color}`}>
                        ${upcharge.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">per award</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              This upcharge is charged when you win an hourly project
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
