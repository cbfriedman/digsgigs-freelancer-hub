import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DemoGigCardProps {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export const DemoGigCard: React.FC<DemoGigCardProps> = ({ title, description, budgetMin, budgetMax }) => {
  const [expanded, setExpanded] = React.useState(false);
  const navigate = useNavigate();

  const short = description.length > 110 ? description.slice(0, 110) + "…" : description;

  return (
    <Card className="h-full flex flex-col border bg-card text-card-foreground shadow-sm">
      <CardContent className="p-6 flex flex-col gap-3 flex-1">
        <div>
          <h4 className="font-semibold text-lg mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">
            {expanded ? description : short}
          </p>
          <button
            type="button"
            className="mt-2 text-primary hover:underline text-sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>

        <div className="mt-2 text-sm text-foreground">
          <span className="font-medium">Budget Range:</span> {formatCurrency(budgetMin)} – {formatCurrency(budgetMax)}
        </div>

        <div className="mt-auto pt-2">
          <Button onClick={() => navigate("/messages")} className="w-full" variant="secondary">
            <MessageSquare className="mr-2" /> Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoGigCard;
