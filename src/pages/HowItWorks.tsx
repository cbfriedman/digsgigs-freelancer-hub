import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Users, 
  Briefcase, 
  DollarSign, 
  MessageSquare, 
  Zap,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  Target
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";

const HowItWorks = () => {
  const navigate = useNavigate();

  const consumerSteps = [
    {
      number: 1,
      title: "Clients Post Projects",
      description: "Describe what you need — design, development, writing, business services, marketing, and more. It's completely free to post.",
      icon: Briefcase,
      color: "primary",
      highlight: "Free to post"
    },
    {
      number: 2,
      title: "Diggers Get Matched Instantly",
      description: "Our system identifies Diggers whose skills match your gig.",
      icon: Zap,
      color: "accent",
      highlight: "Smart matching"
    },
    {
      number: 3,
      title: "Diggers Unlock Leads They Want",
      description: "Freelancers pay only for leads they're interested in. $10 standard leads, $25 high-value leads for Founding Diggers.",
      icon: DollarSign,
      color: "primary",
      highlight: "Pay per lead"
    },
    {
      number: 4,
      title: "Connect & Communicate",
      description: "Send bids, share files, and discuss the gig in Messages—all in one place.",
      icon: MessageSquare,
      color: "accent",
      highlight: "Direct contact"
    },
    {
      number: 5,
      title: "Keep 100% of Your Earnings",
      description: "No commissions on completed work. No bidding wars. No race to the bottom on pricing.",
      icon: CheckCircle2,
      color: "primary",
      highlight: "Zero commission"
    },
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "No Commissions",
      description: "Keep 100% of what you earn. We never take a cut of your gigs.",
      gradient: "from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-600"
    },
    {
      icon: Users,
      title: "No Bidding Wars",
      description: "Choose the Giggers you want. No racing to the bottom on price.",
      gradient: "from-blue-500/10 to-indigo-500/10",
      iconColor: "text-blue-600"
    },
    {
      icon: Target,
      title: "Flat-Rate Leads",
      description: "Pay only for the leads you want. Transparent, predictable pricing.",
      gradient: "from-purple-500/10 to-violet-500/10",
      iconColor: "text-purple-600"
    }
  ];

  const trustSignals = [
    { icon: Shield, label: "Verified Freelancers" },
    { icon: Clock, label: "Fast Response Times" },
    { icon: Sparkles, label: "Quality Matches" }
  ];

  return (
    <PageLayout
      navProps={{ showBackButton: true, backTo: "/", backLabel: "Back to Home" }}
    >
      <SEOHead
        title="How Digs & Gigs Works — For Freelancers (Diggers) & Clients (Giggers)"
        description="Giggers (clients) post gigs. Diggers (freelancers) get leads by email. Pay per lead or when awarded. No commissions, no subscriptions. See how it works."
        keywords="how it works, Digger, Gigger, freelancer leads, client gigs, post gig, pay per lead"
        structuredData={generateFAQSchema([
          { question: "How do Giggers post gigs?", answer: "Giggers describe what they need and post a gig. Diggers bid or buy leads—you review and award when ready." },
          { question: "How do Diggers find gigs?", answer: "Diggers create a profile, browse gigs or get matched, and bid or buy leads. Pay per lead or 8% when awarded—no membership." },
          { question: "Are there any commissions?", answer: "No. Freelancers keep 100% of what they earn. There are no commissions, no bidding wars, and no race to the bottom." }
        ])}
      />

      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
            How It Works
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Simple. Transparent. Built for Results.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Giggers post gigs. Diggers get leads and bid. One clear process for clients and freelancers.
          </p>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {trustSignals.map((signal, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground"
              >
                <signal.icon className="h-4 w-4 text-primary" />
                <span>{signal.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">The Process</h2>
            <p className="text-muted-foreground">From gig to payment in 5 simple steps</p>
          </div>

          <div className="relative">
            {/* Vertical Connection Line (Desktop) */}
            <div className="hidden md:block absolute left-[2.75rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/30 via-accent/30 to-primary/30" />
            
            <div className="space-y-6">
              {consumerSteps.map((step, index) => {
                const IconComponent = step.icon;
                const isEven = index % 2 === 0;
                
                return (
                  <Card 
                    key={step.number} 
                    className={`
                      relative overflow-hidden border-border/50 
                      hover:shadow-lg hover:border-${step.color}/20 
                      transition-all duration-300 hover-lift
                      animate-fade-in-up
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-5">
                        {/* Step Number & Icon */}
                        <div className="relative flex-shrink-0">
                          <div className={`
                            w-14 h-14 rounded-xl flex items-center justify-center
                            bg-gradient-to-br ${step.color === 'primary' ? 'from-primary to-primary/80' : 'from-accent to-accent/80'}
                            shadow-lg
                          `}>
                            <IconComponent className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                            {step.number}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-bold text-xl">{step.title}</h3>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${step.color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}
                            >
                              {step.highlight}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Choose Digs & Gigs?</h2>
            <p className="text-muted-foreground">Built different. Built for you.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden border-border/50 hover:shadow-xl transition-all duration-300 hover-lift"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="relative p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className={`w-8 h-8 ${benefit.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Highlight */}
        <div className="mb-20 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                    Founding Digger Pricing
                  </Badge>
                  <h3 className="text-2xl font-bold mb-4">Lock in low rates — forever.</h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Join as a Founding Digger and lock in exclusive lead pricing for the first year. 
                    Standard leads at $10, high-value leads at just $25.
                  </p>
                  <Button 
                    onClick={() => navigate("/pricing")}
                    className="group"
                  >
                    View Full Pricing
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
                
                <div className="flex justify-center gap-6">
                  <div className="text-center p-6 rounded-2xl bg-background/80 border border-border/50 shadow-sm">
                    <div className="text-4xl font-bold text-primary mb-1">$10</div>
                    <div className="text-sm text-muted-foreground">Standard Lead</div>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-background/80 border border-accent/30 shadow-sm">
                    <div className="text-4xl font-bold text-accent mb-1">$25</div>
                    <div className="text-sm text-muted-foreground">High-Value Lead</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTAs */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join Diggers and Giggers connecting on Digs & Gigs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/register?mode=signup&type=digger")} 
              className="text-lg px-8 group"
            >
              Become a Digger
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/post-gig")} 
              className="text-lg px-8"
            >
              Post a Project
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default HowItWorks;
