import { Card } from "@/components/ui/card";
import { Clock, Shield, Users, Zap } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Get Proposals in Hours",
    description: "Post your project and receive proposals from qualified pros within hours, not days."
  },
  {
    icon: Shield,
    title: "Vetted US-Based Talent",
    description: "Work with freelancers in your timezone who understand your market."
  },
  {
    icon: Users,
    title: "Curated Matches",
    description: "Receive 3-5 highly relevant proposals instead of sorting through hundreds."
  },
  {
    icon: Zap,
    title: "Free to Post",
    description: "No upfront costs, no credit card required. Pay nothing until you hire."
  }
];

export function HireAProBenefits() {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Why Digs & Gigs?
          </span>
          <h2 className="mb-4">Built for Clients Who Value Quality</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We connect you with serious freelancers, not a sea of low-ball bidders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="group p-6 bg-card border-border/50 shadow-card hover:shadow-card-hover hover-lift text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <benefit.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
