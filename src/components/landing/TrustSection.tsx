import { Card } from "@/components/ui/card";
import { DollarSign, Mail, Zap, Shield } from "lucide-react";

const trustPoints = [
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description: "Know exactly what you'll pay before you commit. No hidden fees.",
    bgClass: "bg-success/10",
    iconClass: "text-success",
  },
  {
    icon: Mail,
    title: "Instant Email Delivery",
    description: "Leads hit your inbox the moment they're submitted. No delays.",
    bgClass: "bg-info/10",
    iconClass: "text-info",
  },
  {
    icon: Zap,
    title: "Choose Your Leads",
    description: "Only pay for leads you actually want. No forced packages or subscriptions.",
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
  },
  {
    icon: Shield,
    title: "Lead Protection",
    description: "Bogus leads are fully refundable. We've got your back.",
    bgClass: "bg-warning/10",
    iconClass: "text-warning",
  }
];

export const TrustSection = () => {
  return (
    <section className="section-padding bg-gradient-subtle">
      <div className="container-wide">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Why Choose Us
            </span>
            <h2 className="mb-4">Why Diggers Love Us</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by freelancers, for freelancers. You get leads by email, pay only to unlock the ones you want, and keep 100% of what you earn.
            </p>
          </div>

          {/* Trust Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {trustPoints.map((point, index) => (
              <Card 
                key={index} 
                className="group p-6 bg-card border-border/50 shadow-card hover:shadow-card-hover hover-lift"
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${point.bgClass} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <point.icon className={`h-6 w-6 ${point.iconClass}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {point.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
