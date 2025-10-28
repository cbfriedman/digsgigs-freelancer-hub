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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="font-semibold">{budget}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{timeline}</span>
          </div>
        </div>
        <Button className="w-full" size="sm">View Details</Button>
      </CardContent>
    </Card>
  );
};
