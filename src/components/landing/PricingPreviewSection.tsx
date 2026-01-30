import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Zap, Sparkles } from "lucide-react";

export const PricingPreviewSection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Transparent Pricing
            </span>
            <h2 className="mb-4">Two Ways to Engage</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the pricing model that fits your workflow
            </p>
          </div>

          {/* Limited Time Offer */}
          <div className="mb-10 p-5 bg-gradient-to-r from-success/10 via-success/5 to-success/10 border border-success/20 rounded-2xl shadow-sm animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-success">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Limited Time Offer:</span>
              </div>
              <span>Zero Digger's Setup Fee</span>
              <Badge className="bg-success/20 text-success border-success/30 font-semibold">
                <Sparkles className="h-3 w-3 mr-1" />
                $199 Value
              </Badge>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Non-Exclusive */}
            <Card className="group relative p-8 border-2 border-primary/20 bg-card shadow-card hover:shadow-primary hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-medium">
                Pay Per Lead
              </Badge>
              <h3 className="font-display text-2xl font-bold mb-2">Non-Exclusive Access</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Pay once to unlock client contact details. Other pros may also engage.
              </p>
              
              <div className="mb-2">
                <span className="text-4xl font-display font-bold text-primary">2%</span>
                <span className="text-lg text-muted-foreground ml-2">of budget</span>
              </div>
              <p className="text-sm text-muted-foreground">$10 min – $49 max</p>
            </Card>

            {/* Exclusive */}
            <Card className="group relative p-8 border-2 border-accent/20 bg-card shadow-card hover:shadow-accent hover:border-accent/40 transition-all duration-300 rounded-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20 font-medium">
                Exclusive Award
              </Badge>
              <h3 className="font-display text-2xl font-bold mb-2">15% Gigger Deposit</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Gigger pays 15% upfront. 8% referral fee retained from deposit. Full refund if Digger doesn't accept within 24h.
              </p>
              
              <div className="mb-2">
                <span className="text-4xl font-display font-bold text-accent">8%</span>
                <span className="text-lg text-muted-foreground ml-2">referral fee</span>
              </div>
              <p className="text-sm text-muted-foreground">No minimum or maximum caps</p>
            </Card>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mb-8 italic">
            * Prices are subject to change at any time
          </p>

          {/* Trust Points */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {["No subscriptions", "Bogus leads refunded", "Transparent pricing"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
              onClick={() => navigate("/pricing")}
            >
              View Full Pricing Details
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
