import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ClipboardList, Users, Mail, CheckCircle2, ShoppingCart, MessageSquare, Wallet } from "lucide-react";

type StepVisualProps = {
  kind: "client" | "digger";
  step: number;
  className?: string;
};

const iconMap = {
  client: [ClipboardList, Users, Mail, CheckCircle2],
  digger: [ClipboardList, Users, ShoppingCart, MessageSquare, Wallet],
};

export const StepVisual: React.FC<StepVisualProps> = ({ kind, step }) => {
  const icons = iconMap[kind];
  const Index = icons[(step - 1) % icons.length] || ClipboardList;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl bg-muted/50 border-2 border-border">
      <AspectRatio ratio={16 / 9}>
        <div className="h-full w-full grid place-items-center bg-gradient-to-br from-background to-muted">
          <div className="grid grid-cols-3 gap-6 items-center">
            <div className="size-16 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center">
              <Index className="h-8 w-8 text-primary" />
            </div>
            <div className="size-16 rounded-xl bg-accent/10 border border-accent/20 grid place-items-center">
              <Index className="h-8 w-8 text-accent" />
            </div>
            <div className="size-16 rounded-xl bg-secondary/10 border border-secondary/20 grid place-items-center">
              <Index className="h-8 w-8 text-secondary-foreground" />
            </div>
          </div>
        </div>
      </AspectRatio>
    </div>
  );
};

export default StepVisual;
