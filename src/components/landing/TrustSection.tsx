import { DollarSign, Mail, Zap, Shield } from "lucide-react";

const trustPoints = [
  {
    icon: DollarSign,
    title: "Transparent pricing",
    description: "See the unlock price before you pay. No hidden fees.",
  },
  {
    icon: Mail,
    title: "Leads by email",
    description: "New gigs land in your inbox as soon as Giggers post.",
  },
  {
    icon: Zap,
    title: "Pay only for what you use",
    description: "Unlock a lead or bid and pay when awarded. No subscriptions.",
  },
  {
    icon: Shield,
    title: "Bad leads refunded",
    description: "Invalid or bogus leads are refundable.",
  },
];

export const TrustSection = () => {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-3">Why Diggers use Digs & Gigs</h2>
            <p className="text-muted-foreground">Leads delivered. You choose which to unlock or bid on.</p>
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
