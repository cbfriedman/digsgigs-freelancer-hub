import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const PricingPreviewSection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mb-3">Two ways to engage</h2>
            <p className="text-muted-foreground">Choose the model that fits your workflow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-lg border border-border bg-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pay per lead</p>
              <h3 className="font-semibold text-lg mb-2">Non-exclusive access</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pay once to unlock client contact details. Others may also engage.
              </p>
              <p className="text-2xl font-semibold text-foreground">3% of budget</p>
              <p className="text-xs text-muted-foreground mt-1">$20 min – $69 max</p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Exclusive award</p>
              <h3 className="font-semibold text-lg mb-2">15% gigger deposit</h3>
              <p className="text-sm text-muted-foreground mb-4">
                8% referral fee from deposit. Full refund if Digger doesn't accept within 24h.
              </p>
              <p className="text-2xl font-semibold text-foreground">8% referral fee</p>
              <p className="text-xs text-muted-foreground mt-1">$99 minimum</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-muted-foreground">
            {["No subscriptions", "Bogus leads refunded", "Transparent pricing"].map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" className="border-2" onClick={() => navigate("/pricing")}>
              View full pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
