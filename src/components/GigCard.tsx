import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign } from "lucide-react";

interface GigCardProps {
  title: string;
  description: string;
  budget: string;
  timeline: string;
  category: string;
  bidsCount: number;
}

export const GigCard = ({ title, description, budget, timeline, category, bidsCount }: GigCardProps) => {
  // Extract numeric value from budget string for analysis
  const getBudgetValue = (budgetStr: string): number | null => {
    const match = budgetStr.match(/\$?([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  };

  const getBudgetInsight = (budgetStr: string): string => {
    const value = getBudgetValue(budgetStr);
    if (!value) return "";
    if (value < 1000) return "Quick project";
    if (value < 5000) return "Mid-sized opportunity";
    return "High-value project";
  };

  const budgetInsight = getBudgetInsight(budget);

  return (
    <Card className="transition-all duration-300 hover:shadow-[var(--shadow-hover)] border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Badge variant="outline" className="mb-2">{category}</Badge>
          <span className="text-sm text-muted-foreground">{bidsCount} bids</span>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="font-semibold">{budget}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{timeline}</span>
          </div>
        </div>
        {budgetInsight && (
          <div className="mb-4">
            <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-accent/20">
              {budgetInsight}
            </Badge>
          </div>
        )}
        <Button className="w-full" size="sm">View Details</Button>
      </CardContent>
    </Card>
  );
};
