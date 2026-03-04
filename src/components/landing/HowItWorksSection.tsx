import { Users, Mail, Zap } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Gigger posts a gig",
    description: "Project, budget, and timeline. Goes live immediately.",
  },
  {
    icon: Mail,
    title: "Lead lands in your inbox",
    description: "Every Digger gets the lead by email with details and unlock price.",
  },
  {
    icon: Zap,
    title: "Unlock or bid",
    description: "Pay to unlock client contact, or bid and pay the referral fee when you’re awarded.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-wide">
        <div className="text-center mb-14 home-fade-up" style={{ animationDelay: "0.05s" }}>
          <h2 className="mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Email-first. Pay per lead or per award. No membership.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="text-center home-fade-up"
              style={{ animationDelay: `${0.15 + index * 0.12}s` }}
            >
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
