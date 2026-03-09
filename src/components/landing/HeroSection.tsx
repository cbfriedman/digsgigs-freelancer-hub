import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  return (
    <section className="relative overflow-hidden section-padding">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl opacity-40" />
      
      <div className="container-wide relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in-down">
            <Badge className="mb-8 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium hover:bg-primary/15 transition-colors">
              <Mail className="h-4 w-4 mr-2" />
              Email-First Lead Marketplace
              <Sparkles className="h-3 w-3 ml-2 text-accent" />
            </Badge>
          </div>
          
          {/* Headline */}
          <h1 className="animate-fade-in-up mb-6">
            Where{" "}
            <span className="text-gradient-primary">
              tech talent
            </span>
            {" "}meets{" "}
            <span className="text-gradient-accent">
              opportunity.
            </span>
          </h1>
          
          {/* Subheadline — clear who does what */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto animate-fade-in-up stagger-1 leading-relaxed">
            Clients post projects. Freelancers get leads by email and bid. You choose your role.
          </p>
          <p className="text-base text-muted-foreground/90 mb-10 max-w-2xl mx-auto animate-fade-in-up stagger-1">
            <span className="font-medium text-foreground/90">Gigger</span> = client (post gigs). <span className="font-medium text-foreground/90">Digger</span> = freelancer (get leads & bid). Connect with developers, designers, and digital experts.
          </p>

          {/* Value Props Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto text-left animate-fade-in-up stagger-2">
            {/* For Clients (Giggers) */}
            <div className="group bg-card rounded-xl p-6 border border-accent/20 shadow-card hover:shadow-card-hover hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <h3 className="font-display font-semibold text-lg text-accent">For Clients (Giggers)</h3>
              </div>
              <ul className="space-y-3">
                {["Post gigs for free", "Receive bids from Diggers (freelancers)", "No platform fees on gigs"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* For Freelancers (Diggers) */}
            <div className="group bg-card rounded-xl p-6 border border-primary/20 shadow-card hover:shadow-card-hover hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🔧</span>
                </div>
                <h3 className="font-display font-semibold text-lg text-primary">For Freelancers (Diggers)</h3>
              </div>
              <ul className="space-y-3">
                {["Leads emailed to you—no searching", "Pay a small fee only to unlock leads you want", "You get paid when you win the gig; we keep 0%"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-3">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-accent text-accent-foreground shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => {
                trackButtonClick('Post a Project', 'hero');
                navigate("/post-gig");
              }}
            >
              Post a Project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-primary-lg transition-all duration-300 hover:-translate-y-0.5"
              onClick={() => {
                trackButtonClick('Become a Digger', 'hero');
                navigate("/register?mode=signup&type=digger");
              }}
            >
              Become a Digger
            </Button>
          </div>

          {/* Subtext */}
          <p className="text-sm text-muted-foreground mt-6 animate-fade-in stagger-4">
            Free to join • Pay only to unlock leads (you get paid when you win) • No subscriptions
          </p>
        </div>
      </div>
    </section>
  );
};
