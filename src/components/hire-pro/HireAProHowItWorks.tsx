import { FileCheck, MessageSquare, CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Describe Your Project",
    description: "Tell us what you need—whether it's a website, app, design, or marketing help.",
    icon: FileCheck,
  },
  {
    number: "02",
    title: "Review Proposals",
    description: "Qualified Diggers review your project and submit detailed proposals with pricing.",
    icon: MessageSquare,
  },
  {
    number: "03",
    title: "Hire & Get Started",
    description: "Choose your pro, pay a small deposit, and kick off your project.",
    icon: CheckCircle2,
  },
];

export function HireAProHowItWorks() {
  return (
    <section className="section-padding bg-gradient-subtle">
      <div className="container-wide">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From project post to kickoff in as little as 24 hours
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              <div className="text-[80px] font-display font-bold text-muted/10 leading-none mb-2">
                {step.number}
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-primary text-white flex items-center justify-center mx-auto -mt-12 mb-4 relative z-10 shadow-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
