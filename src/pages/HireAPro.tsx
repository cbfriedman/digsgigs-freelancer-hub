import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Users, 
  Zap,
  Star,
  MessageSquare,
  FileCheck
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";
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

const steps = [
  {
    number: "01",
    title: "Describe Your Project",
    description: "Tell us what you need—whether it's a website, app, design, or marketing help."
  },
  {
    number: "02",
    title: "Review Proposals",
    description: "Qualified Diggers review your project and submit detailed proposals with pricing."
  },
  {
    number: "03",
    title: "Hire & Get Started",
    description: "Choose your pro, pay a small deposit, and kick off your project."
  }
];

const testimonials = [
  {
    quote: "Found an amazing developer in 24 hours. The quality of proposals was incredible.",
    author: "Sarah M.",
    role: "Startup Founder",
    rating: 5
  },
  {
    quote: "Finally, a platform that doesn't take a huge cut. My freelancers are happier and deliver better work.",
    author: "Michael R.",
    role: "Agency Owner",
    rating: 5
  },
  {
    quote: "The US-based talent pool is a game changer. No more timezone headaches.",
    author: "Jennifer L.",
    role: "Marketing Director",
    rating: 5
  }
];

const categories = [
  "Web Development",
  "Mobile Apps",
  "UI/UX Design",
  "SEO & Marketing",
  "AI & Automation",
  "Data Analysis",
  "Branding",
  "Copywriting"
];

export default function HireAPro() {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  const handlePostProject = () => {
    trackButtonClick('Post a Project', 'hire-a-pro');
    navigate("/post-gig");
  };

  return (
    <PageLayout showFooter={true} maxWidth="wide" padded={false}>
      <SEOHead
        title="Hire a Pro - Find Top Tech Talent"
        description="Hire vetted software developers, designers, and digital experts. Get proposals in hours, pay only 8% when you hire. Free to post."
        keywords="hire freelancer, hire developer, find designer, tech talent, software development, web design"
      />

      {/* Benefits Grid */}
      <section className="section-padding pt-6 md:pt-8">
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

      {/* How It Works */}
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
                  {index === 0 && <FileCheck className="h-6 w-6" />}
                  {index === 1 && <MessageSquare className="h-6 w-6" />}
                  {index === 2 && <CheckCircle2 className="h-6 w-6" />}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-10">
            <h2 className="mb-4">Find Experts In</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {categories.map((category, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-gradient-subtle">
        <div className="container-wide">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
              Trusted by Clients
            </span>
            <h2 className="mb-4">What Clients Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-card border-border/50 shadow-card">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl opacity-50" />
        
        <div className="container-wide relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent text-white mb-8 shadow-accent-lg animate-float">
              <Zap className="h-8 w-8" />
            </div>
            
            <h2 className="mb-6">Ready to Find Your Perfect Pro?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Post your project in 2 minutes. Get proposals today.
              <span className="text-accent font-medium"> Free to post.</span>
            </p>
            
            <Button 
              size="lg" 
              className="text-lg px-12 py-6 bg-gradient-accent text-accent-foreground shadow-accent-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              onClick={handlePostProject}
            >
              Post Your Project — It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Proposals in hours
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
