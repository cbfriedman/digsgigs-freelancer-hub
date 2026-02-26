import { DollarSign, Mail, Zap, Shield } from "lucide-react";

const trustPoints = [
  {
    icon: DollarSign,
    title: "Transparent pricing",
    description: "Know what you pay before you commit. No hidden fees.",
  },
  {
    icon: Mail,
    title: "Instant email delivery",
    description: "Leads hit your inbox as soon as they're submitted.",
  },
  {
    icon: Zap,
    title: "Choose your leads",
    description: "Pay only for leads you want. No packages or subscriptions.",
  },
  {
    icon: Shield,
    title: "Lead protection",
    description: "Bogus leads are refundable.",
  },
];

export const TrustSection = () => {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-3">Why diggers love us</h2>
            <p className="text-muted-foreground">Built by freelancers, for freelancers.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {trustPoints.map((point, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <point.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{point.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
