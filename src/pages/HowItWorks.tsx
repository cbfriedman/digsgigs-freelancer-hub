import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, Briefcase, DollarSign, MessageSquare, Zap } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";

const HowItWorks = () => {
  const navigate = useNavigate();

  const consumerSteps = [
    {
      number: 1,
      title: "Consumers Post Projects",
      description: "Clients describe what they need — design, development, writing, business services, marketing, etc.",
      icon: Briefcase,
    },
    {
      number: 2,
      title: "Diggers Are Instantly Matched",
      description: "We identify freelancers whose skills match the project requirements.",
      icon: Zap,
    },
    {
      number: 3,
      title: "Diggers Choose Which Leads to Reveal",
      description: "Pay only if you want to contact the client: $10 standard leads, $25 high-value leads (First year for Founders).",
      icon: DollarSign,
    },
    {
      number: 4,
      title: "Connect & Get Hired",
      description: "Send proposals, communicate, exchange files, and win clients — right inside the platform.",
      icon: MessageSquare,
    },
    {
      number: 5,
      title: "Keep 100% of Your Earnings",
      description: "No commissions. No bidding wars. No race to the bottom.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="How Digs & Gigs Works — Fair, Simple Freelancing"
        description="No commissions. No bidding wars. Learn how freelancers and clients connect instantly on Digs & Gigs."
        keywords="how it works, freelance marketplace, no commissions, no bidding wars, hire freelancers, find clients"
        structuredData={generateFAQSchema([
          { question: "How do clients post projects?", answer: "Clients describe what they need — design, development, writing, business services, marketing, etc. — and get matched instantly with qualified freelancers." },
          { question: "How do freelancers find work?", answer: "Freelancers create a profile, select their skills & categories, and receive matched project requests. They pay only for lead reveals ($10/$25 first year for Founders)." },
          { question: "Are there any commissions?", answer: "No. Freelancers keep 100% of what they earn. There are no commissions, no bidding wars, and no race to the bottom." }
        ])}
      />
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">How It Works</Badge>
          <h1 className="text-5xl font-bold mb-4">How Digs & Gigs Works</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple. Transparent. Built for Results.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 max-w-4xl mx-auto mb-16">
          {consumerSteps.map((step) => {
            const IconComponent = step.icon;
            return (
              <Card key={step.number} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-sm">Step {step.number}</Badge>
                      <h3 className="font-bold text-xl">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Key Benefits */}
        <div className="bg-secondary/30 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Digs & Gigs?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">No Commissions</h3>
              <p className="text-sm text-muted-foreground">Keep 100% of what you earn. We never take a cut of your projects.</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">No Bidding Wars</h3>
              <p className="text-sm text-muted-foreground">Choose the clients you want. No racing to the bottom on price.</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Flat-Rate Leads</h3>
              <p className="text-sm text-muted-foreground">Pay only for the leads you want. $10 standard, $25 high-value (first year).</p>
            </Card>
          </div>
        </div>

        {/* CTAs */}
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join thousands of freelancers and clients connecting on Digs & Gigs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/register?role=digger")} className="text-lg px-8">
              Become a Digger
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/post-gig")} className="text-lg px-8">
              Post a Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
