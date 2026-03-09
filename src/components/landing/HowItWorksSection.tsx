import { Card } from "@/components/ui/card";
import { Users, Mail, Zap } from "lucide-react";

const steps = [
  {
    icon: Users,
    step: "01",
    title: "Client Posts a Project",
    description: "Clients (Giggers) describe their project, budget, and timeline. Posting is free. No approval gate.",
    iconBgClass: "bg-primary/10",
    iconTextClass: "text-primary",
  },
  {
    icon: Mail,
    step: "02",
    title: "You Get the Lead by Email",
    description: "You don’t search for work—we email you matching leads. Every Digger gets the lead instantly with project details and pricing.",
    iconBgClass: "bg-accent/10",
    iconTextClass: "text-accent",
  },
  {
    icon: Zap,
    step: "03",
    title: "Unlock & Bid — Then Get Paid",
    description: "Pay a small fee to unlock the client’s contact so you can bid. When you win the job, you get paid; we never take a cut of your earnings.",
    iconBgClass: "bg-primary/10",
    iconTextClass: "text-primary",
  }
];

export const HowItWorksSection = () => {
  return (
    <section className="section-padding bg-gradient-subtle">
      <div className="container-wide">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            For Freelancers (Diggers)
          </span>
          <h2 className="mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            You don’t look up projects or wait for someone to contact you. We email you leads; you choose which to unlock and bid on. You get paid when you win.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Clients (Giggers): post a gig for free and receive bids from Diggers—no cost to post or to hire.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="group relative text-center p-8 bg-card border-border/50 shadow-card hover:shadow-card-hover hover-lift overflow-hidden"
            >
              {/* Step Number Background */}
              <div className="absolute -top-4 -right-4 text-[120px] font-display font-bold text-muted/10 select-none leading-none">
                {step.step}
              </div>
              
              {/* Icon */}
              <div className={`relative z-10 w-16 h-16 rounded-2xl ${step.iconBgClass} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <step.icon className={`h-8 w-8 ${step.iconTextClass}`} />
              </div>
              
              {/* Step Label */}
              <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-3">
                Step {step.step}
              </span>
              
              {/* Content */}
              <h3 className="font-display font-semibold text-xl mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Connection Lines (Desktop) */}
        <div className="hidden md:flex justify-center mt-8">
          <div className="flex items-center gap-4 text-muted-foreground/50">
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent to-primary/30 rounded" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
            <div className="w-48 h-0.5 bg-primary/30 rounded" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
            <div className="w-24 h-0.5 bg-gradient-to-l from-transparent to-primary/30 rounded" />
          </div>
        </div>
      </div>
    </section>
  );
};
