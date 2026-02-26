import { Users, Mail, Zap } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Client submits project",
    description: "Clients describe project, budget, and timeline. No approval gate.",
  },
  {
    icon: Mail,
    title: "You get an email",
    description: "Diggers receive the lead via email with details and pricing.",
  },
  {
    icon: Zap,
    title: "Unlock or bid",
    description: "Pay to unlock contact info, or submit a proposal and pay when you win.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-wide">
        <div className="text-center mb-14">
          <h2 className="mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Simple, fair, instant lead delivery.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
